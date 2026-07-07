import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();
async function run() {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: "what is 2+2",
      },
    ],
  });
  return response.choices[0].message.content;
}
console.log(run());
