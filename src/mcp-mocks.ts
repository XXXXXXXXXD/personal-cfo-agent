/**
 * MCP (Model Context Protocol) Mocks & Interfaces
 * 
 * To setup real MCP servers:
 * 1. For Gmail: Use a generic Google API MCP server or fetch-mcp to hit Gmail API.
 * 2. For Google Finance: Use a custom Python/Node MCP server scraping/calling finance APIs, or an existing one like github.com/modelcontextprotocol/servers
 * 
 * If you haven't installed them, configure your MCP client to point to the respective server binaries.
 */

// Gmail MCP Tool Call Mocks
export const mockGmailMcp = {
  /**
   * Search for invoice emails based on query (e.g., "subject:電子發票")
   */
  async searchEmails(query: string) {
    console.log(`[MCP: gmail] Searching emails with query: ${query}`);
    return [
      { id: 'msg1', snippet: 'Your e-invoice for...', date: new Date().toISOString() }
    ];
  },

  /**
   * Read email content to extract invoice details
   */
  async getEmailContent(messageId: string) {
    console.log(`[MCP: gmail] Fetching content for msg: ${messageId}`);
    return {
      body: "Invoice Number: AB12345678\nAmount: $150"
    };
  }
};

// Google Finance MCP Tool Call Mocks
export const mockFinanceMcp = {
  /**
   * Get current stock/crypto price
   */
  async getQuote(symbol: string) {
    console.log(`[MCP: google-finance] Fetching quote for ${symbol}`);
    return {
      symbol,
      price: 150.25,
      currency: symbol.includes('TWD') ? 'TWD' : 'USD',
      lastUpdated: new Date().toISOString()
    };
  },

  /**
   * Get historical data
   */
  async getHistoricalData(symbol: string, period: string) {
    console.log(`[MCP: google-finance] Fetching historical data for ${symbol} over ${period}`);
    return [
      { date: '2023-01-01', close: 140 },
      { date: '2023-01-02', close: 142 }
    ];
  }
};
