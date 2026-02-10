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

//--- Global variables
datetime lastHeartbeat = 0;
datetime lastSync = 0;
int lastDealCount = 0;
bool isInitialized = false;

//+------------------------------------------------------------------+
//| Expert initialization function                                     |
//+------------------------------------------------------------------+
int OnInit()
{
    if(StringLen(TerminalId) == 0)
    {
        Print("Error: TerminalId is required");
        return(INIT_FAILED);
    }
    
    if(StringLen(APIEndpoint) == 0)
    {
        Print("Error: APIEndpoint is required");
        return(INIT_FAILED);
    }
    
    Print("Trading Journal Sync EA initialized");
    Print("Terminal ID: ", TerminalId);
    Print("API Endpoint: ", APIEndpoint);
    
    // Set timer for periodic tasks
    EventSetTimer(10);
    
    // Do initial sync
    WriteLog("OnInit: Initializing...");
    SendHeartbeat();
    SyncDealHistory();
    
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
    
    // Heartbeat
    if(now - lastHeartbeat >= HeartbeatInterval)
    {
        SendHeartbeat();
        lastHeartbeat = now;
    }
    
    // Periodic sync
    if(now - lastSync >= SyncInterval)
    {
        SyncDealHistory();
        lastSync = now;
    }
}

//+------------------------------------------------------------------+
//| Trade event function                                               |
//+------------------------------------------------------------------+
void OnTrade()
{
    // New trade or position change detected
    SyncPositions();
    SyncDealHistory(); // Sync history immediately when a trade event occurs (e.g. position closed)
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
        json += "\"terminalId\":\"" + TerminalId + "\",";
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
        string url = APIEndpoint + "/api/webhook/terminal/candles";
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
    string url = APIEndpoint + "/api/webhook/terminal/heartbeat";
    
    // Build JSON payload
    string json = "{";
    json += "\"terminalId\":\"" + TerminalId + "\",";
    json += "\"accountInfo\":{";
    json += "\"balance\":" + DoubleToString(AccountInfoDouble(ACCOUNT_BALANCE), 2) + ",";
    json += "\"equity\":" + DoubleToString(AccountInfoDouble(ACCOUNT_EQUITY), 2) + ",";
    json += "\"margin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN), 2) + ",";
    json += "\"freeMargin\":" + DoubleToString(AccountInfoDouble(ACCOUNT_MARGIN_FREE), 2);
    json += "}}";
    
    // Send request
    string result = SendRequest(url, json);
    
    if(StringFind(result, "success") >= 0)
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
void SyncDealHistory()
{
    // Get deals from last 30 days
    // Get full history
    datetime fromDate = 0;
    datetime toDate = TimeCurrent();
    
    if(!HistorySelect(fromDate, toDate))
    {
        Print("Failed to select history");
        WriteLog("Error: Failed to select history");
        return;
    }
    
    int totalDeals = HistoryDealsTotal();
    WriteLog("SyncCheck: Total Deals=" + IntegerToString(totalDeals) + ", LastCount=" + IntegerToString(lastDealCount));
    
    // Check if new deals since last sync
    if(totalDeals == lastDealCount)
    {
        return; // No new deals
    }
    
    Print("Syncing ", totalDeals, " deals...");
    
    // Build trades JSON array
    string tradesJson = "[";
    bool firstTrade = true;
    
    for(int i = 0; i < totalDeals; i++)
    {
        ulong ticket = HistoryDealGetTicket(i);
        if(ticket == 0) continue;
        
        // Get deal properties
        ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
        ENUM_DEAL_TYPE type = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
        
        // Only process buy/sell deals (not balance, credit, etc.)
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
        long reason = HistoryDealGetInteger(ticket, DEAL_REASON);
        double sl = HistoryDealGetDouble(ticket, DEAL_SL);
        double tp = HistoryDealGetDouble(ticket, DEAL_TP);
        double contractSize = SymbolInfoDouble(symbol, SYMBOL_TRADE_CONTRACT_SIZE);
        
        if(!firstTrade) tradesJson += ",";
        firstTrade = false;
        
        tradesJson += "{";
        tradesJson += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
        tradesJson += "\"symbol\":\"" + symbol + "\",";
        tradesJson += "\"type\":\"" + (type == DEAL_TYPE_BUY ? "BUY" : "SELL") + "\",";
        tradesJson += "\"volume\":" + DoubleToString(volume, 2) + ",";
        tradesJson += "\"openPrice\":" + DoubleToString(price, 5) + ",";
        tradesJson += "\"commission\":" + DoubleToString(commission, 2) + ",";
        tradesJson += "\"swap\":" + DoubleToString(swap, 2) + ",";
        tradesJson += "\"profit\":" + DoubleToString(profit, 2) + ",";
        tradesJson += "\"openTime\":\"" + TimeToString(time, TIME_DATE|TIME_SECONDS) + "\",";
        tradesJson += "\"comment\":\"" + EscapeJSON(comment) + "\",";
        tradesJson += "\"positionId\":" + IntegerToString(positionId) + ",";
        tradesJson += "\"magic\":" + IntegerToString(magic) + ",";
        tradesJson += "\"entryType\":" + IntegerToString((long)entry) + ",";
        tradesJson += "\"reason\":" + IntegerToString(reason) + ",";
        tradesJson += "\"stopLoss\":" + DoubleToString(sl, 5) + ",";
        tradesJson += "\"takeProfit\":" + DoubleToString(tp, 5) + ",";
        tradesJson += "\"contractSize\":" + DoubleToString(contractSize, 2);
        tradesJson += "}";
    }
    
    tradesJson += "]";
    
    // Build final JSON
    string json = "{";
    json += "\"terminalId\":\"" + TerminalId + "\",";
    json += "\"trades\":" + tradesJson;
    json += "}";
    
    // Send request - Updated to use /api/webhook/terminal/trades
    string url = APIEndpoint + "/api/webhook/terminal/trades";
    string result = SendRequest(url, json);
    
    if(StringFind(result, "success") >= 0)
    {
        Print("Trade sync completed successfully");
        WriteLog("Success: Trade sync uploaded. Deals=" + IntegerToString(totalDeals));
        lastDealCount = totalDeals;
    }
    else
    {
        Print("Trade sync failed: ", result);
        WriteLog("Error: Trade sync failed. Response: " + result);
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
        datetime openTime = (datetime)PositionGetInteger(POSITION_TIME);
        
        if(!firstPosition) positionsJson += ",";
        firstPosition = false;
        
        positionsJson += "{";
        positionsJson += "\"ticket\":\"" + IntegerToString(ticket) + "\",";
        positionsJson += "\"symbol\":\"" + symbol + "\",";
        positionsJson += "\"type\":\"" + (type == POSITION_TYPE_BUY ? "BUY" : "SELL") + "\",";
        positionsJson += "\"volume\":" + DoubleToString(volume, 2) + ",";
        positionsJson += "\"openPrice\":" + DoubleToString(openPrice, 5) + ",";
        positionsJson += "\"currentPrice\":" + DoubleToString(currentPrice, 5) + ",";
        positionsJson += "\"profit\":" + DoubleToString(profit, 2) + ",";
        positionsJson += "\"openTime\":\"" + TimeToString(openTime, TIME_DATE|TIME_SECONDS) + "\"";
        positionsJson += "}";
    }
    
    positionsJson += "]";
    
    // Build final JSON
    string json = "{";
    json += "\"terminalId\":\"" + TerminalId + "\",";
    json += "\"positions\":" + positionsJson;
    json += "}";
    
    // Send request - Updated to use /api/webhook/terminal/positions
    string url = APIEndpoint + "/api/webhook/terminal/positions";
    string result = SendRequest(url, json);
    
    if(StringFind(result, "success") >= 0)
    {
        Print("Position sync completed: ", totalPositions, " positions");
    }
}

//+------------------------------------------------------------------+
//| Send HTTP POST request                                              |
//+------------------------------------------------------------------+
string SendRequest(string url, string jsonData)
{
    char postData[];
    char resultData[];
    string resultHeaders;
    string headers = "Content-Type: application/json\r\n";
    
    // Updated to use lowercase header name (x-api-key) to match backend
    if(StringLen(APIKey) > 0)
    {
        headers += "x-api-key: " + APIKey + "\r\n";
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
        return "Error: " + IntegerToString(errorCode);
    }
    
    // Convert response to string
    string result = CharArrayToString(resultData);
    return result;
}
//+------------------------------------------------------------------+
