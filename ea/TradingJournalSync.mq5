//+------------------------------------------------------------------+
//|                                           TradingJournalSync.mq5 |
//|                       Desktop MT5 sync for the Trading Journal   |
//+------------------------------------------------------------------+
#property copyright "Trading Journal"
#property link      "https://www.tradetaper.io"
#property version   "1.00"
#property strict

input string BackendURL = "";
input string APIKey = "";
input string TerminalId = "";
input int HeartbeatInterval = 15;
input int SyncInterval = 15;
input int HistorySyncBatchSize = 200;
input int InitialHistoryDays = 90;
input bool EnableDebugLog = true;

datetime gLastHeartbeatAt = 0;
datetime gLastHeartbeatAttemptAt = 0;
datetime gLastTradeSyncAt = 0;
datetime gLastPositionsSyncAt = 0;
datetime gLastHistorySyncAt = 0;
int gLastDealCount = 0;
bool gTradeSyncDirty = true;
bool gSessionValidated = false;
bool gFirstTimerTickLogged = false;
string gLastHistorySyncReason = "startup";
string gBackendURL = "";
string gAPIKey = "";
string gTerminalId = "";
int gHeartbeatInterval = 15;
int gSyncInterval = 15;
int gInitialHistoryDays = 90;
string gLastDealCountKey = "";
string gLastSyncTimeKey = "";

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
    if(!EnableDebugLog)
    {
        return;
    }

    int handle = FileOpen("trading-journal-sync.log", FILE_WRITE|FILE_TXT|FILE_READ|FILE_SHARE_READ|FILE_SHARE_WRITE);
    if(handle == INVALID_HANDLE)
    {
        return;
    }

    FileSeek(handle, 0, SEEK_END);
    FileWrite(handle, TimeToString(TimeCurrent(), TIME_DATE|TIME_SECONDS) + " " + message);
    FileClose(handle);
}

void TrimInPlace(string &value)
{
    StringTrimLeft(value);
    StringTrimRight(value);
}

void NormalizeEndpoint()
{
    TrimInPlace(gBackendURL);
    while(StringLen(gBackendURL) > 0 && StringSubstr(gBackendURL, StringLen(gBackendURL) - 1, 1) == "/")
    {
        gBackendURL = StringSubstr(gBackendURL, 0, StringLen(gBackendURL) - 1);
    }
}

bool IsSuccessfulResponse(string result)
{
    return StringFind(result, "\"success\":true") >= 0;
}

bool IsSessionMismatchResponse(string result)
{
    return StringFind(result, "\"code\":\"SESSION_MISMATCH\"") >= 0;
}

bool IsUnauthorizedResponse(string result)
{
    return StringFind(result, "\"code\":\"UNAUTHORIZED\"") >= 0;
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

string SendRequest(string url, string jsonData)
{
    char postData[];
    char resultData[];
    string resultHeaders;
    string headers = "Content-Type: application/json\r\n";

    if(StringLen(gAPIKey) > 0)
    {
        headers += "x-api-key: " + gAPIKey + "\r\n";
    }

    StringToCharArray(jsonData, postData, 0, StringLen(jsonData));

    int response = WebRequest(
        "POST",
        url,
        headers,
        5000,
        postData,
        resultData,
        resultHeaders
    );

    if(response == -1)
    {
        int errorCode = GetLastError();
        if(errorCode == 4014)
        {
            WriteLog("WebRequest blocked. Add backend origin to Tools > Options > Expert Advisors > Allow WebRequest.");
        }
        return "Error: " + IntegerToString(errorCode);
    }

    return CharArrayToString(resultData);
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
            "Trade sync batch " + IntegerToString(batchNumber) +
            " failed. Response: " + result
        );
        return false;
    }

    WriteLog(
        "Trade sync batch " + IntegerToString(batchNumber) +
        " uploaded. Deals=" + IntegerToString(dealCount)
    );
    return true;
}

bool SendHeartbeat()
{
    gLastHeartbeatAttemptAt = TimeCurrent();

    string url = gBackendURL + "/api/webhook/terminal/heartbeat";
    int totalDeals = gLastDealCount;
    // Use a far-future sentinel so the upper bound never excludes history on SIM/demo
    // accounts whose server clock is behind real time (TimeCurrent() may return a stale date).
    datetime heartbeatTo = D'2099.12.31 23:59:59';
    if(HistorySelect(0, heartbeatTo))
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
    string lastHistoryAt = gLastHistorySyncAt > 0
        ? TimeToString(gLastHistorySyncAt, TIME_DATE|TIME_SECONDS)
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
    json += "\"lastHistorySyncReason\":\"" + gLastHistorySyncReason + "\"";
    json += "}}";

    string result = SendRequest(url, json);
    if(!IsSuccessfulResponse(result))
    {
        Print("Heartbeat failed: ", result);
        WriteLog("Heartbeat failed. Result: " + result);
        if(IsSessionMismatchResponse(result) || IsUnauthorizedResponse(result))
        {
            gSessionValidated = false;
        }
        return false;
    }

    gSessionValidated = true;
    Print("Heartbeat sent successfully");
    return true;
}

bool SyncDealHistory(string reason)
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
        : (datetime)(TimeCurrent() - MathMax(1, gInitialHistoryDays) * 86400);
    // Use a far-future sentinel so HistorySelect never misses deals on SIM/demo accounts
    // where TimeCurrent() returns a server time that is behind real-world time.
    datetime toDate = D'2099.12.31 23:59:59';

    if(!HistorySelect(fromDate, toDate))
    {
        Print("Failed to select history");
        WriteLog("Failed to select history. Error=" + IntegerToString(GetLastError()));
        return false;
    }

    int totalDeals = HistoryDealsTotal();
    WriteLog(
        "SyncCheck: Total Deals=" + IntegerToString(totalDeals) +
        ", LastCount=" + IntegerToString(restoredDealCount)
    );

    if(totalDeals == restoredDealCount && restoredSyncTime > 0)
    {
        gLastDealCount = totalDeals;
        gLastHistorySyncAt = TimeCurrent();
        gLastHistorySyncReason = "no_change";
        return true;
    }

    Print("Syncing ", totalDeals, " deals...");

    string url = gBackendURL + "/api/webhook/terminal/trades";
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
        tradeJson += "\"openPrice\":" + DoubleToString(price, _Digits) + ",";
        tradeJson += "\"commission\":" + DoubleToString(commission, 2) + ",";
        tradeJson += "\"swap\":" + DoubleToString(swap, 2) + ",";
        tradeJson += "\"profit\":" + DoubleToString(profit, 2) + ",";
        tradeJson += "\"openTime\":\"" + TimeToString(time, TIME_DATE|TIME_SECONDS) + "\",";
        tradeJson += "\"comment\":\"" + EscapeJSON(comment) + "\",";
        tradeJson += "\"positionId\":\"" + IntegerToString((int)positionId) + "\",";
        tradeJson += "\"magic\":" + IntegerToString((int)magic) + ",";
        tradeJson += "\"entryType\":" + IntegerToString((int)entry) + ",";
        tradeJson += "\"reason\":" + IntegerToString((int)dealReason) + ",";
        tradeJson += "\"stopLoss\":" + DoubleToString(sl, _Digits) + ",";
        tradeJson += "\"takeProfit\":" + DoubleToString(tp, _Digits) + ",";
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

    gLastHistorySyncAt = TimeCurrent();
    gLastHistorySyncReason = reason;

    if(!syncSucceeded)
    {
        Print("Trade sync failed");
        WriteLog("Trade sync failed before all batches completed.");
        return false;
    }

    Print("Trade sync completed successfully");
    WriteLog(
        "Trade sync uploaded. VisibleDeals=" + IntegerToString(totalDeals) +
        ", SyncedDeals=" + IntegerToString(syncedDealCount) +
        ", Batches=" + IntegerToString(batchNumber)
    );

    gLastDealCount = totalDeals;
    if(StringLen(gLastDealCountKey) > 0)
    {
        GlobalVariableSet(gLastDealCountKey, (double)totalDeals);
    }
    if(StringLen(gLastSyncTimeKey) > 0)
    {
        GlobalVariableSet(gLastSyncTimeKey, (double)TimeCurrent());
    }

    return true;
}

bool SyncPositions()
{
    int totalPositions = PositionsTotal();
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
        positionsJson += "\"ticket\":\"" + IntegerToString((int)ticket) + "\",";
        positionsJson += "\"positionId\":\"" + IntegerToString((int)positionId) + "\",";
        positionsJson += "\"symbol\":\"" + symbol + "\",";
        positionsJson += "\"type\":\"" + (type == POSITION_TYPE_BUY ? "BUY" : "SELL") + "\",";
        positionsJson += "\"volume\":" + DoubleToString(volume, 2) + ",";
        positionsJson += "\"openPrice\":" + DoubleToString(openPrice, _Digits) + ",";
        positionsJson += "\"currentPrice\":" + DoubleToString(currentPrice, _Digits) + ",";
        positionsJson += "\"profit\":" + DoubleToString(profit, 2) + ",";
        positionsJson += "\"openTime\":\"" + TimeToString(openTime, TIME_DATE|TIME_SECONDS) + "\",";
        positionsJson += "\"stopLoss\":" + DoubleToString(stopLoss, _Digits) + ",";
        positionsJson += "\"takeProfit\":" + DoubleToString(takeProfit, _Digits) + ",";
        positionsJson += "\"swap\":" + DoubleToString(swap, 2) + ",";
        positionsJson += "\"comment\":\"" + EscapeJSON(comment) + "\"";
        positionsJson += "}";
    }

    positionsJson += "]";

    string json = "{";
    json += "\"terminalId\":\"" + gTerminalId + "\",";
    json += "\"positions\":" + positionsJson;
    json += "}";

    string url = gBackendURL + "/api/webhook/terminal/positions";
    string result = SendRequest(url, json);
    if(!IsSuccessfulResponse(result))
    {
        Print("Position sync failed: ", result);
        WriteLog("Position sync failed. Result: " + result);
        return false;
    }

    Print("Position sync completed: ", totalPositions, " positions");
    return true;
}

int OnInit()
{
    Print("TradingJournalSync OnInit entered");
    WriteLog("OnInit entered.");

    gBackendURL = BackendURL;
    gAPIKey = APIKey;
    gTerminalId = TerminalId;
    gHeartbeatInterval = MathMax(1, HeartbeatInterval);
    gSyncInterval = MathMax(1, SyncInterval);
    gInitialHistoryDays = MathMax(1, InitialHistoryDays);

    TrimInPlace(gAPIKey);
    TrimInPlace(gTerminalId);
    NormalizeEndpoint();

    if(StringLen(gTerminalId) == 0)
    {
        Print("Error: TerminalId is required");
        WriteLog("Initialization failed. TerminalId is required.");
        return(INIT_FAILED);
    }

    if(StringLen(gBackendURL) == 0)
    {
        Print("Error: BackendURL is required");
        WriteLog("Initialization failed. BackendURL is required.");
        return(INIT_FAILED);
    }

    if(StringLen(gAPIKey) == 0)
    {
        Print("Error: APIKey is required");
        WriteLog("Initialization failed. APIKey is required.");
        return(INIT_FAILED);
    }

    gLastDealCountKey = "TJ_LastDealCount_" + gTerminalId;
    gLastSyncTimeKey = "TJ_LastSyncTime_" + gTerminalId;

    WriteLog(
        "Initialized. TerminalIdLen=" + IntegerToString(StringLen(gTerminalId)) +
        ", Endpoint=" + gBackendURL
    );

    EventSetTimer(1);
    WriteLog("Startup timer armed. Initial sync will run on timer.");
    Print("TradingJournalSync timer armed");

    Print("Trading Journal desktop sync EA initialized");
    return(INIT_SUCCEEDED);
}

void OnDeinit(const int reason)
{
    EventKillTimer();
    WriteLog("EA stopped. Reason=" + IntegerToString(reason));
}

void OnTimer()
{
    datetime now = TimeCurrent();

    if(!gFirstTimerTickLogged)
    {
        Print("TradingJournalSync first timer tick");
        WriteLog("First timer tick fired.");
        gFirstTimerTickLogged = true;
    }

    bool shouldRefreshHeartbeat = now - gLastHeartbeatAttemptAt >= gHeartbeatInterval;

    if(shouldRefreshHeartbeat)
    {
        if(SendHeartbeat())
        {
            gLastHeartbeatAt = now;
        }
    }

    if(!gSessionValidated)
    {
        if(gTradeSyncDirty)
        {
            WriteLog("Trade sync deferred until linked account heartbeat succeeds.");
        }
        return;
    }

    if(now - gLastPositionsSyncAt >= gSyncInterval)
    {
        if(SyncPositions())
        {
            gLastPositionsSyncAt = now;
        }
    }

    if(gTradeSyncDirty || now - gLastTradeSyncAt >= gSyncInterval)
    {
        string reason = gTradeSyncDirty ? "new_deal" : "poll";
        if(SyncDealHistory(reason))
        {
            gLastTradeSyncAt = now;
            if(gTradeSyncDirty)
            {
                gTradeSyncDirty = false;
            }
        }
    }
}

void OnTradeTransaction(
    const MqlTradeTransaction &trans,
    const MqlTradeRequest &request,
    const MqlTradeResult &result
)
{
    if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
    {
        gTradeSyncDirty = true;
        WriteLog("Trade transaction detected. Deal=" + IntegerToString((int)trans.deal));
    }
}
