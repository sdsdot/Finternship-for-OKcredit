{
  "entities": {
    "User": {
      "title": "User",
      "description": "StockX merchant user account settings and inventory balances",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "email": { "type": "string" },
        "name": { "type": "string" },
        "stocks": { "type": "object" },
        "thresholds": { "type": "object" }
      },
      "required": ["id", "email", "name", "stocks", "thresholds"]
    },
    "Sale": {
      "title": "Sale",
      "description": "Earthy sales entries for stock tracking",
      "type": "object",
      "properties": {
        "id": { "type": "string" },
        "userId": { "type": "string" },
        "date": { "type": "string" },
        "product": { "type": "string" },
        "qty": { "type": "number" },
        "price": { "type": "number" },
        "revenue": { "type": "number" }
      },
      "required": ["id", "userId", "date", "product", "qty", "price", "revenue"]
    }
  },
  "firestore": {
    "/users/{userId}": {
      "schema": { "$ref": "#/entities/User" },
      "description": "Details and metadata for each active merchant"
    },
    "/sales/{saleId}": {
      "schema": { "$ref": "#/entities/Sale" },
      "description": "Log of user food sales and inventory deductions"
    }
  }
}
