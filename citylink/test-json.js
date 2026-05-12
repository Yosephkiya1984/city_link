const rawText = "```json_action\n{\n  \"text\": \"Transfer funds from 0905040504 to 200 ETB\",\n  \"action\": {\n    \"type\": \"TRANSFER_MONEY\",\n    \"data\": {\n      \"amount\": 200,\n      \"recipient\": \"0905040504\",\n      \"currency\": \"ETB\"\n    }\n  }\n}\n```";

if (rawText.includes('json_action') || rawText.includes('"action"')) {
  try {
    const markerIdx = rawText.indexOf('json_action');
    const searchStart = markerIdx !== -1 ? markerIdx : 0;
    const startIdx = rawText.indexOf('{', searchStart);
    const endIdx = rawText.lastIndexOf('}');
    
    console.log("startIdx", startIdx);
    console.log("endIdx", endIdx);

    if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
      let possibleJson = rawText.slice(startIdx, endIdx + 1);
      console.log("BEFORE SANITIZE:", possibleJson);
      
      // Sanitize common LLM JSON errors (smart quotes, trailing commas)
      possibleJson = possibleJson
        .replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
        .replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
        .replace(/,\s*([\]}])/g, '$1');  // Remove trailing commas
        
      console.log("AFTER SANITIZE:", possibleJson);

      const actionData = JSON.parse(possibleJson);
      console.log("PARSED OK", actionData);
    }
  } catch (e) {
    console.error("PARSE FAILED", e);
  }
}
