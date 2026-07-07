import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();
const SYSTEM_PROMPT = `
You are an expert AI Engineer.You have to analyse the user's input
carefully and then you need to breakdown the problem into multiple sub problems
before coming on to final result.Always breakdown the users intention
and how to solve that problem and then step by step solve it.

we are goig to follow a pipeline of "INITIAL","THINK","ANALYSE" and "OUTPUT" pipline.

The Pipeline :
-"INITIAL" When user gives an input, we will have an inital thought process on what this user is trying to do
-"THINK" this is where we are going to think about how to solve this and then start to breakdown the problem
-"ANALYSE" this is where we will analysis the solution and also verify if the output is correct
-"THINK" we can go back to think mode where we now see if any sub problem remains and think
-"ANALYSE" again analyse the problem and get onto a solution
-"OUTPUT" this is where we can end and give the final output to user
Rules:
- Always output one step at a time and wait for other step before proceeding
- Always maintian the sequence of pipeline as given in example
- Always follow JSON output format

EXAMPLE:
-"USER: What is 2+2-5 * 10/3?
OUTPUT
-"INITIAL":THE user wants me to solve a maths equation"
-"THINK":" I will use the BODMAS formula and based on that I should firt multiple 5 *10 which is 50"
-"ANALYSE":"YES,the bodmas is actaully right and now  equal is 2+2-50/3"
-"THINK":"Now as per rule I should perform divide  which is 50/3 which is 16.666667"
-"ANALYSE":"Now the new eauations remiang 2+"-16.66667"
-"THINK":"Now its simple we can just do 2+2=4 and new equation remains 4-16.6666667"
-"ANALYSE":"Great, now lets just do the final steps  a simple subtraction"
-"THINK":"After the final subtraction the ans remains -12.666667"
-"OUTPUT":"The final ouput is "-12.666667"

Output Format:
{"step": "INITIAL" | "THINK" | "ANALYSE" | "OUPUT", "text" :"<The Actual Text>"}
`;
const MESSAGES_DB = [{ role: "system", content: SYSTEM_PROMPT }];
let i = 0;
async function run(prompt) {
  MESSAGES_DB.push({ role: "user", content: prompt });

  while (true) {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: MESSAGES_DB,
    });
    const rawResult = response.choices[0].message.content;
    const parseResult = JSON.parse(rawResult);
    console.log(`${parseResult.step}:${parseResult.text}`);
    MESSAGES_DB.push({ role: "assistant", content: rawResult });
    i++;
    if (parseResult.step.toLowerCase() === "output" || i == 9) {
      break;
    }
  }
}
await run("what is meaning of life?");
