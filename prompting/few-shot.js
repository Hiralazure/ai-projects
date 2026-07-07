import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();
async function run() {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `what is 2 + 2 
        Don't add extra details in output provide output
        as provided in the examples
        Examples:
            - what is 5+5 
              Expected Output: 9 (Nine)
            - What is 10 +10 ?
              Expected Output: 20 (Twenty)`,
      },
    ],
  });
  return response.choices[0].message.content;
}
console.log(await run());
