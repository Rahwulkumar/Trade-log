//+------------------------------------------------------------------+
//|                                              TradeTaperSync.mq5 |
//|                                      Copyright 2024, TradeTaper |
//|                                       https://www.tradetaper.io |
//|                    Modified for Trading Journal Terminal Farm   |
//+------------------------------------------------------------------+
#property copyright "TradeTaper"
#property link      "https://www.tradetaper.io"
#property version   "1.00"
#property strict

//--- Input parameters
input string   APIEndpoint = "";                                 // Trading Journal API URL (set via environment)
input string   APIKey = "";                                       // API Key / Webhook Secret (set via environment)
input string   TerminalId = "";                                   // Terminal ID (set via environment)
input int      HeartbeatInterval = 30;                            // Heartbeat interval (seconds)
input int      SyncInterval = 60;                                 // Trade sync interval (seconds)
input int      HistorySyncBatchSize = 200;                        // Max MT5 deals per trade sync request

//--- Global variables
datetime lastHeartbeat = 0;
datetime lastSync = 0;
int lastDealCount = 0;
bool isInitialized = false;
datetime lastHistorySyncAt = 0;
string lastHistorySyncReason = "startup";
string gAPIEndpoint = "";
string gAPIKey = "";
string gTerminalId = "";
int gHeartbeatInterval = 30;
int gSyncInterval = 60;
string gLastDealCountKey = "";
string gLastSyncTimeKey = "";

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
    gAPIEndpoint = APIEndpoint;
    gAPIKey = APIKey;
    gTerminalId = TerminalId;
    gHeartbeatInterval = HeartbeatInterval;
    gSyncInterval = SyncInterval;

    if(StringLen(gAPIEndpoint) == 0 || StringLen(gTerminalId) == 0 || StringLen(gAPIKey) == 0)
    {
        LoadRuntimeConfig();
    }

    TrimInPlace(gAPIEndpoint);
    TrimInPlace(gAPIKey);
    TrimInPlace(gTerminalId);

    WriteLog(
        "OnInit: Config resolved. TerminalIdLen=" + IntegerToString(StringLen(gTerminalId)) +
        ", EndpointLen=" + IntegerToString(StringLen(gAPIEndpoint)) +
        ", ApiKeyLen=" + IntegerToString(StringLen(gAPIKey))
    );

    if(StringLen(gTerminalId) == 0)
    {
        Print("Error: TerminalId is required");
        WriteLog("Error: TerminalId is required after config resolution");
        return(INIT_FAILED);
    }
    
    if(StringLen(gAPIEndpoint) == 0)
    {
        Print("Error: APIEndpoint is required");
        WriteLog("Error: APIEndpoint is required after config resolution");
        return(INIT_FAILED);
    }
    
    Print("Trading Journal Sync EA initialized");
    Print("Terminal ID: ", gTerminalId);
    Print("API Endpoint: ", gAPIEndpoint);

    gLastDealCountKey = "TJ_LastDealCount_" + gTerminalId;
    gLastSyncTimeKey = "TJ_LastSyncTime_" + gTerminalId;
    
    // Set timer for periodic tasks
    EventSetTimer(10);
    
    // Do initial sync
    WriteLog("OnInit: Initializing...");
    SyncDealHistory("startup");
    SendHeartbeat();
    
    isInitialized = true;
    return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                   |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
    EventKillTimer();
    Print("Trading Journal Sync EA stopped");
}

//+------------------------------------------------------------------+
//| Timer function                                                      |
//+------------------------------------------------------------------+
void OnTimer()
{
    datetime now = TimeCurrent();
    
    // Periodic sync
    if(now - lastSync >= gSyncInterval)
    {
        SyncDealHistory("poll");
        lastSync = now;
    }

    // Heartbeat
    if(now - lastHeartbeat >= gHeartbeatInterval)
    {
        SendHeartbeat();
        lastHeartbeat = now;
    }
}

//+------------------------------------------------------------------+
//| Trade event function                                               |
//+------------------------------------------------------------------+
void OnTrade()
{
    // New trade or position change detected
    SyncPositions();
    SyncDealHistory("new_deal"); // Sync history immediately when a trade event occurs (e.g. position closed)
}

// Helper to escape JSON strings
string EscapeJSON(string text)
{
    string output = text;
    StringReplace(output, "\\", "\\\\");
    StringReplace(output, "\"", "\\\"");
    StringReplace(output, "\n", " ");
    StringReplace(output, "\r", "");
    StringReplace(output, "\t", " ");
    return output;
}

bool IsSuccessfulResponse(string result)
{
    return StringFind(result, "\"success\":true") >= 0;
}

bool SendTradeSyncBatch(string url, string tradesJson, int dealCount, int batchNumber)
{
    string json = "{";
    json += "\"terminalId\":\"" + gTerminalId + "\",";
    json += "\"trades\":" + tradesJson;
    json += "}";

    string result = SendRequest(url, json);
    if(!IsSuccessfulResponse(result))
    {
        Print("Trade sync batch failed: ", result);
        WriteLog(
            "Error: Trade sync batch " + IntegerToString(batchNumber) +
            " failed. Response: " + result
        );
        return false;
    }

    WriteLog(
        "Success: Trade sync batch " + IntegerToString(batchNumber) +
        " uploaded. Deals=" + IntegerToString(dealCount)
    );
    return true;
}

void WriteLog(string message)
{
    int handle = FileOpen("debug.log", FILE_WRITE|FILE_TXT|FILE_READ|FILE_SHARE_READ|FILE_SHARE_WRITE);
    if(handle != INVALID_HANDLE)
    {
        FileSeek(handle, 0, SEEK_END);
        FileWrite(handle, TimeToString(TimeCurrent()) + " " + message);
        FileClose(handle);
    }
}

bool IsBrokerSessionReady(
    string loginStr,
    string server,
    string accountName,
    string company,
    string currency,
    double balance,
    double equity,
    int totalDeals,
    int openPositions
)
{
    if(StringLen(loginStr) == 0 || loginStr == "0") return false;
    if(StringLen(server) == 0) return false;
    if(StringLen(accountName) > 0 || StringLen(company) > 0 || StringLen(currency) > 0) return true;
    if(MathAbs(balance) > 0.00001 || MathAbs(equity) > 0.00001) return true;
    if(totalDeals > 0 || openPositions > 0) return true;
    return false;
}

void WriteSessionStatus(
    string loginStr,
    string server,
    string accountName,
    string company,
    string currency,
    double balance,
    double equity,
    int totalDeals,
    int openPositions
)
{
    int handle = FileOpen("session_status.json", FILE_WRITE|FILE_TXT|FILE_SHARE_READ|FILE_SHARE_WRITE);
    if(handle == INVALID_HANDLE)
    {
        return;
    }

    bool ready = IsBrokerSessionReady(
        loginStr,
        server,
        accountName,
        company,
        currency,
        balance,
        equity,
        totalDeals,
        openPositions
    );

    string json = "{";
    json += "\"ready\":" + (ready ? "true" : "false") + ",";
    json += "\"terminalId\":\"" + EscapeJSON(gTerminalId) + "\",";
    json += "\"login\":\"" + EscapeJSON(loginStr) + "\",";
    json += "\"server\":\"" + EscapeJSON(server) + "\",";
    json += "\"accountName\":\"" + EscapeJSON(accountName) + "\",";
    json += "\"company\":\"" + EscapeJSON(company) + "\",";
    json += "\"currency\":\"" + EscapeJSON(currency) + "\",";
    json += "\"balance\":" + DoubleToString(balance, 2) + ",";
    json += "\"equity\":" + DoubleToString(equity, 2) + ",";
    json += "\"totalDeals\":" + IntegerToString(totalDeals) + ",";
    json += "\"openPositions\":" + IntegerToString(openPositions) + ",";
    json += "\"updatedAt\":\"" + TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + "\"";
    json += "}";

    FileWriteString(handle, json);
    FileClose(handle);
}

void TrimInPlace(string &value)
{
    StringTrimLeft(value);
    StringTrimRight(value);
}

void ApplyConfigLine(string line)
{
    TrimInPlace(line);
    if(StringLen(line) == 0) return;
    if(StringSubstr(line, 0, 1) == "#") return;

    int sep = StringFind(line, "=");
    if(sep <= 0) return;

    string key = StringSubstr(line, 0, sep);
    string value = StringSubstr(line, sep + 1);
    TrimInPlace(key);
    TrimInPlace(value);

    if(key == "APIEndpoint")
    {
        gAPIEndpoint = value;
    }
    else if(key == "APIKey")
    {
        gAPIKey = value;
    }
    else if(key == "TerminalId")
    {
        gTerminalId = value;
    }
    else if(key == "HeartbeatInterval")
    {
        int parsedHeartbeat = (int)StringToInteger(value);
        if(parsedHeartbeat > 0) gHeartbeatInterval = parsedHeartbeat;
    }
    else if(key == "SyncInterval")
    {
        int parsedSync = (int)StringToInteger(value);
        if(parsedSync > 0) gSyncInterval = parsedSync;
    }
}

void LoadRuntimeConfig()
{
    int handle = FileOpen("TradeTaperSync.cfg", FILE_READ|FILE_TXT|FILE_ANSI);
    if(handle == INVALID_HANDLE)
    {
        WriteLog("Runtime config TradeTaperSync.cfg not found. Error=" + IntegerToString(GetLastError()));
        return;
    }

    while(!FileIsEnding(handle))
    {
        string line = FileReadString(handle);
        ApplyConfigLine(line);
    }

    FileClose(handle);
}

//+------------------------------------------------------------------+
//| Fetch candle data for a symbol and time range                    |
//+------------------------------------------------------------------+
void FetchCandles(string symbol, string timeframeStr, string startStr, string endStr, string tradeId)
{
    ENUM_TIMEFRAMES period = PERIOD_H1;
    if(timeframeStr == "1m") period = PERIOD_M1;
    else if(timeframeStr == "5m") period = PERIOD_M5;
    else if(timeframeStr == "15m") period = PERIOD_M15;
    else if(timeframeStr == "30m") period = PERIOD_M30;
    else if(timeframeStr == "1h") period = PERIOD_H1;
    else if(timeframeStr == "4h") period = PERIOD_H4;
    else if(timeframeStr == "1d") period = PERIOD_D1;
    
    datetime start = StringToTime(startStr);
    datetime end = StringToTime(endStr);
    
    // Ensure we get data including the range (+ buffer if needed, but start/end should cover it)
    MqlRates rates[];
    ArraySetAsSeries(rates, true);
    
    int copied = CopyRates(symbol, period, start, end, rates);
    if(copied > 0)
    {
        string json = "{";
        json += "\"terminalId\":\"" + gTerminalId + "\",";
        json += "\"tradeId\":\"" + tradeId + "\",";
        json += "\"symbol\":\"" + symbol + "\",";
        json += "\"candles\":[";
        
        for(int i=copied-1; i>=0; i--)
        {
            json += "{";
            json += "\"time\":" + IntegerToString(rates[i].time) + ",";
            json += "\"open\":" + DoubleToString(rates[i].open, _Digits) + ",";
            json += "\"high\":" + DoubleToString(rates[i].high, _Digits) + ",";
            json += "\"low\":" + DoubleToString(rates[i].low, _Digits) + ",";
            json += "\"close\":" + DoubleToString(rates[i].close, _Digits);
            json += "}";
            if(i > 0) json += ",";
        }
        
        json += "]}";
        
        // Send data - Updated to use /api/webhook/terminal/candles
        string url = gAPIEndpoint + "/api/webhook/terminal/candles";
        SendRequest(url, json);
        WriteLog("Sent " + IntegerToString(copied) + " candles for " + symbol);
    }
    else
    {
        WriteLog("Failed to CopyRates for " + symbol + ". Error=" + IntegerToString(GetLastError()));
    }
}

//+------------------------------------------------------------------+
//| Simple JSON Value Extractor (Helper)                             |
//+------------------------------------------------------------------+
string GetJsonValue(string json, string key)
{
    string searchKey = "\"" + key + "\":";
    int start = StringFind(json, searchKey);
    if(start == -1) return "";
    
    start += StringLen(searchKey);
    
    // Check if string value
    bool isString = (StringSubstr(json, start, 1) == "\"");
    if(isString) start++;
    
    // Find end
    int end = -1;
    if(isString) end = StringFind(json, "\"", start);
    else 
    {
        int end1 = StringFind(json, ",", start);
        int end2 = StringFind(json, "}", start);
        if(end1 == -1) end = end2;
        else if(end2 == -1) end = end1;
        else end = MathMin(end1, end2);
    }
    
    if(end == -1) return "";
    return StringSubstr(json, start, end - start);
}


//+------------------------------------------------------------------+
//| Send heartbeat to Trading Journal API                             |
//+------------------------------------------------------------------+
void SendHeartbeat()
{
    // Updated to use /api/webhook/terminal/heartbeat
    string url = gAPIEndpoint + "/api/webhook/terminal/heartbeat";
    int totalDeals = lastDealCount;
    if(HistorySelect(0, TimeCurrent()))
    {
        totalDeals = HistoryDealsTotal();
    }
    string loginStr = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
    string server = AccountInfoString(ACCOUNT_SERVER);
    string accountName = AccountInfoString(ACCOUNT_NAME);
    string company = AccountInfoString(ACCOUNT_COMPANY);
    string currency = AccountInfoString(ACCOUNT_CURRENCY);
    double balance = AccountInfoDouble(ACCOUNT_BALANCE);
    double equity = AccountInfoDouble(ACCOUNT_EQUITY);
    double margin = AccountInfoDouble(ACCOUNT_MARGIN);
    double freeMargin = AccountInfoDouble(ACCOUNT_MARGIN_FREE);
    int openPositions = PositionsTotal();
    string lastHistoryAt = lastHistorySyncAt > 0
        ? TimeToString(lastHistorySyncAt, TIME_DATE|TIME_SECONDS)
        : TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS);

    WriteSessionStatus(
        loginStr,
        server,
        accountName,
        company,
        currency,
        balance,
        equity,
        totalDeals,
        openPositions
    );
    
    // Build JSON payload
    string json = "{";
    json += "\"terminalId\":\"" + gTerminalId + "\",";
    json += "\"accountInfo\":{";
    json += "\"balance\":" + DoubleToString(balance, 2) + ",";
    json += "\"equity\":" + DoubleToString(equity, 2) + ",";
    json += "\"margin\":" + DoubleToString(margin, 2) + ",";
    json += "\"freeMargin\":" + DoubleToString(freeMargin, 2);
    json += "},";
    json += "\"sessionInfo\":{";
    json += "\"login\":\"" + loginStr + "\",";
    json += "\"server\":\"" + EscapeJSON(server) + "\",";
    json += "\"accountName\":\"" + EscapeJSON(accountName) + "\",";
    json += "\"company\":\"" + EscapeJSON(company) + "\",";
    json += "\"currency\":\"" + EscapeJSON(currency) + "\"";
    json += "},";
    json += "\"syncState\":{";
    json += "\"totalDeals\":" + IntegerToString(totalDeals) + ",";
    json += "\"openPositions\":" + IntegerToString(openPositions) + ",";
    json += "\"lastHistorySyncAt\":\"" + lastHistoryAt + "\",";
    json += "\"lastHistorySyncReason\":\"" + lastHistorySyncReason + "\"";
    json += "}}";
    
    // Send request
    string result = SendRequest(url, json);
    
    if(IsSuccessfulResponse(result))
    {
        Print("Heartbeat sent successfully");
        
        // Check for commands
        string command = GetJsonValue(result, "command");
        if(command == "FETCH_CANDLES")
        {
            string payload = GetJsonValue(result, "payload");
            WriteLog("Received Command: FETCH_CANDLES. Args: " + payload);
            
            // Payload format: SYMBOL,TIMEFRAME,START,END,TRADEID
            string args[];
            int count = StringSplit(payload, ',', args);
            
            if(count == 5)
            {
                FetchCandles(args[0], args[1], args[2], args[3], args[4]);
            }
            else
            {
                WriteLog("Error: Invalid FETCH_CANDLES args count: " + IntegerToString(count));
            }
        }
    }
    else
    {
        Print("Heartbeat failed: ", result);
        WriteLog("Error: Heartbeat failed. Result: " + result);
    }
}

//+------------------------------------------------------------------+
//| Sync deal history with Trading Journal                            |
//+------------------------------------------------------------------+
void SyncDealHistory(string reason)
{
    int restoredDealCount = 0;
    if(StringLen(gLastDealCountKey) > 0 && GlobalVariableCheck(gLastDealCountKey))
    {
        restoredDealCount = (int)GlobalVariableGet(gLastDealCountKey);
    }

    long restoredSyncTime = 0;
    if(StringLen(gLastSyncTimeKey) > 0 && GlobalVariableCheck(gLastSyncTimeKey))
    {
        restoredSyncTime = (long)GlobalVariableGet(gLastSyncTimeKey);
    }

    datetime fromDate = restoredSyncTime > 0
        ? (datetime)(restoredSyncTime - 86400)
        : (datetime)(TimeCurrent() - 90 * 86400);
    datetime toDate = TimeCurrent();
    
    if(!HistorySelect(fromDate, toDate))
    {
        Print("Failed to select history");
        WriteLog("Error: Failed to select history");
        return;
    }
    
    int totalDeals = HistoryDealsTotal();
    WriteLog("SyncCheck: Total Deals=" + IntegerToString(totalDeals) + ", LastCount=" + IntegerToString(restoredDealCount));

    // Check if new deals since last sync
    if(totalDeals == restoredDealCount && restoredSyncTime > 0)
    {
        lastDealCount = totalDeals;
        lastHistorySyncAt = TimeCurrent();
        lastHistorySyncReason = "no_change";
        return; // No new deals
    }
    
    Print("Syncing ", totalDeals, " deals...");

    string url = gAPIEndpoint + "/api/webhook/terminal/trades";
    int batchSize = MathMax(1, HistorySyncBatchSize);
    string tradesJson = "[";
    bool firstTrade = true;
    int batchDealCount = 0;
    int syncedDealCount = 0;
    int batchNumber = 0;
    bool syncSucceeded = true;

    for(int i = 0; i < totalDeals; i++)
    {
        ulong ticket = HistoryDealGetTicket(i);
        if(ticket == 0) continue;

        ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
        ENUM_DEAL_TYPE type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);

        if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL) continue;

        string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
        double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
        double price = HistoryDealGetDouble(ticket, DEAL_PRICE);
        double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
        double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
        double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
        datetime time = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
        string comment = HistoryDealGetString(ticket, DEAL_COMMENT);

        long positionId = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
        long magic = HistoryDealGetInteger(ticket, DEAL_MAGIC);
        long dealReason = HistoryDealGetInteger(ticket, DEAL_REASON);
        double sl = HistoryDealGetDouble(ticket, DEAL_SL);
        double tp = HistoryDealGetDouble(ticket, DEAL_TP);
        double contractSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_CONTRACT_SIZE);

        string tradeJson = "{";
        tradeJson += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
        tradeJson += "\"symbol\":\"" + symbol + "\",";
        tradeJson += "\"type\":\"" + (type == DEAL_TYPE_BUY ? "BUY" : "SELL") + "\",";
        tradeJson += "\"volume\":" + DoubleToString(volume, 2) + ",";
        tradeJson += "\"openPrice\":" + DoubleToString(price, 5) + ",";
        tradeJson += "\"commission\":" + DoubleToString(commission, 2) + ",";
        tradeJson += "\"swap\":" + DoubleToString(swap, 2) + ",";
        tradeJson += "\"profit\":" + DoubleToString(profit, 2) + ",";
        tradeJson += "\"openTime\":\"" + TimeToString(time, TIME_DATE|TIME_SECONDS) + "\",";
        tradeJson += "\"comment\":\"" + EscapeJSON(comment) + "\",";
        tradeJson += "\"positionId\":" + IntegerToString(positionId) + ",";
        tradeJson += "\"magic\":" + IntegerToString(magic) + ",";
        tradeJson += "\"entryType\":" + IntegerToString((long)entry) + ",";
        tradeJson += "\"reason\":" + IntegerToString(dealReason) + ",";
        tradeJson += "\"stopLoss\":" + DoubleToString(sl, 5) + ",";
        tradeJson += "\"takeProfit\":" + DoubleToString(tp, 5) + ",";
        tradeJson += "\"contractSize\":" + DoubleToString(contractSize, 2);
        tradeJson += "}";

        if(!firstTrade) tradesJson += ",";
        firstTrade = false;
        tradesJson += tradeJson;

        batchDealCount++;
        syncedDealCount++;

        if(batchDealCount >= batchSize)
        {
            tradesJson += "]";
            batchNumber++;

            if(!SendTradeSyncBatch(url, tradesJson, batchDealCount, batchNumber))
            {
                syncSucceeded = false;
                break;
            }

            tradesJson = "[";
            firstTrade = true;
            batchDealCount = 0;
        }
    }

    if(syncSucceeded && (batchDealCount > 0 || syncedDealCount == 0))
    {
        tradesJson += "]";
        batchNumber++;
        syncSucceeded = SendTradeSyncBatch(url, tradesJson, batchDealCount, batchNumber);
    }

    lastHistorySyncAt = TimeCurrent();
    lastHistorySyncReason = reason;
    
    if(syncSucceeded)
    {
        Print("Trade sync completed successfully");
        WriteLog(
            "Success: Trade sync uploaded. VisibleDeals=" + IntegerToString(totalDeals) +
            ", SyncedDeals=" + IntegerToString(syncedDealCount) +
            ", Batches=" + IntegerToString(batchNumber)
        );
        lastDealCount = totalDeals;
        if(StringLen(gLastDealCountKey) > 0)
        {
            GlobalVariableSet(gLastDealCountKey, (double)totalDeals);
        }
        if(StringLen(gLastSyncTimeKey) > 0)
        {
            GlobalVariableSet(gLastSyncTimeKey, (double)TimeCurrent());
        }
    }
    else
    {
        Print("Trade sync failed");
        WriteLog("Error: Trade sync failed before all batches completed.");
    }
}

//+------------------------------------------------------------------+
//| Sync open positions with Trading Journal                          |
//+------------------------------------------------------------------+
void SyncPositions()
{
    int totalPositions = PositionsTotal();
    
    // Build positions JSON array
    string positionsJson = "[";
    bool firstPosition = true;
    
    for(int i = 0; i < totalPositions; i++)
    {
        ulong ticket = PositionGetTicket(i);
        if(ticket == 0) continue;
        
        string symbol = PositionGetString(POSITION_SYMBOL);
        ENUM_POSITION_TYPE type = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
        double volume = PositionGetDouble(POSITION_VOLUME);
        double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
        double currentPrice = PositionGetDouble(POSITION_PRICE_CURRENT);
        double profit = PositionGetDouble(POSITION_PROFIT);
        double stopLoss = PositionGetDouble(POSITION_SL);
        double takeProfit = PositionGetDouble(POSITION_TP);
        double swap = PositionGetDouble(POSITION_SWAP);
        datetime openTime = (datetime)PositionGetInteger(POSITION_TIME);
        long positionId = PositionGetInteger(POSITION_IDENTIFIER);
        string comment = PositionGetString(POSITION_COMMENT);
        
        if(!firstPosition) positionsJson += ",";
        firstPosition = false;
        
        positionsJson += "{";
        positionsJson += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
        positionsJson += "\"positionId\":\"" + IntegerToString((int)positionId) + "\",";
        positionsJson += "\"symbol\":\"" + symbol + "\",";
        positionsJson += "\"type\":\"" + (type == POSITION_TYPE_BUY ? "BUY" : "SELL") + "\",";
        positionsJson += "\"volume\":" + DoubleToString(volume, 2) + ",";
        positionsJson += "\"openPrice\":" + DoubleToString(openPrice, 5) + ",";
        positionsJson += "\"currentPrice\":" + DoubleToString(currentPrice, 5) + ",";
        positionsJson += "\"profit\":" + DoubleToString(profit, 2) + ",";
        positionsJson += "\"openTime\":\"" + TimeToString(openTime, TIME_DATE|TIME_SECONDS) + "\",";
        positionsJson += "\"stopLoss\":" + DoubleToString(stopLoss, 5) + ",";
        positionsJson += "\"takeProfit\":" + DoubleToString(takeProfit, 5) + ",";
        positionsJson += "\"swap\":" + DoubleToString(swap, 2) + ",";
        positionsJson += "\"comment\":\"" + EscapeJSON(comment) + "\"";
        positionsJson += "}";
    }
    
    positionsJson += "]";
    
    // Build final JSON
    string json = "{";
    json += "\"terminalId\":\"" + gTerminalId + "\",";
    json += "\"positions\":" + positionsJson;
    json += "}";
    
    // Send request - Updated to use /api/webhook/terminal/positions
    string url = gAPIEndpoint + "/api/webhook/terminal/positions";
    string result = SendRequest(url, json);
    
    if(IsSuccessfulResponse(result))
    {
        Print("Position sync completed: ", totalPositions, " positions");
    }
}

//+------------------------------------------------------------------+
//| Send HTTP POST request                                              |
//+------------------------------------------------------------------+
bool QueueRequestForBridge(string url, string jsonData)
{
    FolderCreate("bridge_outbox");

    string fileName = "bridge_outbox\\req_" +
        IntegerToString((int)TimeCurrent()) + "_" +
        IntegerToString((int)GetTickCount()) + ".req";

    int handle = FileOpen(fileName, FILE_WRITE|FILE_TXT|FILE_ANSI);
    if(handle == INVALID_HANDLE)
    {
        WriteLog("Error: Failed to queue payload for bridge. FileOpen error=" + IntegerToString(GetLastError()));
        return false;
    }

    FileWrite(handle, url);
    FileWrite(handle, jsonData);
    FileClose(handle);

    WriteLog("Queued payload for bridge: " + fileName);
    return true;
}

string SendRequest(string url, string jsonData)
{
    char postData[];
    char resultData[];
    string resultHeaders;
    string headers = "Content-Type: application/json\r\n";
    
    // Updated to use lowercase header name (x-api-key) to match backend
    if(StringLen(gAPIKey) > 0)
    {
        headers += "x-api-key: " + gAPIKey + "\r\n";
    }
    
    // Convert string to char array
    StringToCharArray(jsonData, postData, 0, StringLen(jsonData));
    
    // Reset timeout
    int timeout = 5000;
    
    // Send request
    int response = WebRequest(
        "POST",
        url,
        headers,
        timeout,
        postData,
        resultData,
        resultHeaders
    );
    
    if(response == -1)
    {
        int errorCode = GetLastError();

        // MT5 can block WebRequest (error 4014) when URL permissions are not available.
        // Queue payloads for an external curl bridge process to ensure sync still progresses.
        if(errorCode == 4014)
        {
            if(QueueRequestForBridge(url, jsonData))
            {
                return "{\"success\":true,\"queued\":true}";
            }
        }

        return "Error: " + IntegerToString(errorCode);
    }
    
    // Convert response to string
    string result = CharArrayToString(resultData);
    return result;
}
//+------------------------------------------------------------------+
