//+------------------------------------------------------------------+
//|                                           TradingJournalSync.mq5 |
//|                                  Copyright 2024, Trading Journal |
//|                                       https://tradingjournal.com |
//+------------------------------------------------------------------+
#property copyright "Trading Journal"
#property link      "https://tradingjournal.com"
#property version   "1.00"
#property strict

// --- Input Parameters ---
input string   InpWebhookUrl  = "https://your-domain.com/api/mt5/webhook"; // Webhook URL
input string   InpWebhookKey  = ""; // Your Secret Webhook Key (Paste from Dashboard)
input int      InpMagicNumber = 0;  // Magic Number Filter (0 for all)

// --- Globals ---
int lastTicket = 0;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   // Allow WebRequest
   Print("Initializing Trading Journal Sync...");
   
   if(InpWebhookKey == "") {
      Alert("Please enter your Webhook Key in inputs!");
      return(INIT_FAILED);
   }

   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| TradeTransaction function                                        |
//| Monitors for closed deals                                        |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
  {
   // We are interested in DEAL_ADD transactions (when a deal is added to history)
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
     {
      long dealTicket = trans.deal;
      
      // Select the deal to get properties
      if(HistoryDealSelect(dealTicket))
        {
         long entryEntry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
         
         // We only care about ENTRY_OUT (closing a position) or ENTRY_INOUT (reversing)
         if(entryEntry == DEAL_ENTRY_OUT || entryEntry == DEAL_ENTRY_INOUT)
           {
             long magic = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
             if(InpMagicNumber != 0 && magic != InpMagicNumber) return;

             // Prepare Data
             SendTradeData(dealTicket);
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| SendTradeData function                                           |
//| Formats JSON and sends POST request                              |
//+------------------------------------------------------------------+
void SendTradeData(long ticket)
  {
   string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
   long type = HistoryDealGetInteger(ticket, DEAL_TYPE); // 0=Buy, 1=Sell
   double volume = HistoryDealGetDouble(ticket, DEAL_VOLUME);
   double priceOpen = 0; // Need to find opening price logic, simplified for now
   double priceClose = HistoryDealGetDouble(ticket, DEAL_PRICE);
   long timeClose = HistoryDealGetInteger(ticket, DEAL_TIME);
   double profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
   double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
   double swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
   long magic = HistoryDealGetInteger(ticket, DEAL_MAGIC);

   // Get Position ID to find opening time/price
   long positionId = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
   long timeOpen = GetPositionOpenTime(positionId);
   double openPrice = GetPositionOpenPrice(positionId); 

   // Prepare JSON
   // Note: MQL5 doesn't have native JSON, constructing string manually
   string json = "{";
   json += "\"ticket\":" + IntegerToString(ticket) + ",";
   json += "\"symbol\":\"" + symbol + "\",";
   json += "\"type\":\"" + (type == DEAL_TYPE_BUY ? "buy" : "sell") + "\",";
   json += "\"lots\":\"" + DoubleToString(volume, 2) + "\",";
   json += "\"open_price\":\"" + DoubleToString(openPrice, 5) + "\",";
   json += "\"open_time\":\"" + TimeToString(timeOpen, TIME_DATE|TIME_MINUTES|TIME_SECONDS) + "\","; 
   // Note: Best to send unix timestamp or strict ISO 8601 if possible, simplified here
   json += "\"close_price\":\"" + DoubleToString(priceClose, 5) + "\",";
   json += "\"close_time\":\"" + TimeToString(timeClose, TIME_DATE|TIME_MINUTES|TIME_SECONDS) + "\","; 
   json += "\"profit\":\"" + DoubleToString(profit, 2) + "\",";
   json += "\"commission\":\"" + DoubleToString(commission, 2) + "\",";
   json += "\"swap\":\"" + DoubleToString(swap, 2) + "\",";
   json += "\"magic\":\"" + IntegerToString(magic) + "\"";
   json += "}";

   // Headers
   string headers = "Content-Type: application/json\r\nx-webhook-key: " + InpWebhookKey;
   char data[];
   StringToCharArray(json, data, 0, StringLen(json));
   char result[];
   string resultHeaders;

   // Send Request
   int res = WebRequest("POST", InpWebhookUrl, headers, 3000, data, data, resultHeaders);
   
   if(res == 200) {
      Print("Trade " + IntegerToString(ticket) + " synced successfully.");
   } else {
      Print("Failed to sync trade " + IntegerToString(ticket) + ". Error: " + IntegerToString(GetLastError()));
   }
  }

//+------------------------------------------------------------------+
//| Helpers                                                          |
//+------------------------------------------------------------------+
long GetPositionOpenTime(long positionId) {
   // Simplified: Scan history for the ENTRY_IN deal of this position
   // In real algo, we'd need more robust logic for scaling in/out
   if (HistorySelectByPosition(positionId)) {
      int deals = HistoryDealsTotal();
      for(int i=0; i<deals; i++) {
         ulong ticket = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_IN) {
            return HistoryDealGetInteger(ticket, DEAL_TIME);
         }
      }
   }
   return 0; 
}

double GetPositionOpenPrice(long positionId) {
   if (HistorySelectByPosition(positionId)) {
      int deals = HistoryDealsTotal();
      for(int i=0; i<deals; i++) {
         ulong ticket = HistoryDealGetTicket(i);
         if(HistoryDealGetInteger(ticket, DEAL_ENTRY) == DEAL_ENTRY_IN) {
            return HistoryDealGetDouble(ticket, DEAL_PRICE);
         }
      }
   }
   return 0; 
}
