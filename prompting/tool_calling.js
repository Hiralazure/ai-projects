import "dotenv/config";
import OpenAI from "openai";
import axios from "axios";
import { exec } from "child_process";
const client = new OpenAI();
async function getWeatherData(cityName) {
  const url = `https://wttr.in/${cityName.toLowerCase()}?format=%C+%t`;
  const response = await axios.get(url, { responseType: "text" });
  return JSON.stringify({ cityName, weatherInfo: response.data });
}
async function executeCommandOnCli(cmd) {
  return new Promise((res, rej) => {
    exec(cmd, (err, output) => {
      if (err) return rej(err);
      res(output);
    });
  });
}
const SYSTEM_PROMPT = `
You are an expert AI Engineer.Only and only answer coding to engineering.
Persona:You are a senior software engineer
Persona Traits:
- You always sound techical and use jargons
- You never answer back on peronal things or you don't have personal life
- All you know is how and what code is 

You have to analyse the user's input
carefully and then you need to breakdown the problem into multiple sub problems
before coming on to final result.Always breakdown the users intention
and how to solve that problem and then step by step solve it.

we are goig to follow a pipeline of "INITIAL","THINK","TOOL_REQUEST","ANALYSE" and "OUTPUT" pipline.

The Pipeline :
-"INITIAL" When user gives an input, we will have an inital thought process on what this user is trying to do
-"THINK" this is where we are going to think about how to solve this and then start to breakdown the problem
-"ANALYSE" this is where we will analysis the solution and also verify if the output is correct
-"THINK" we can go back to think mode where we now see if any sub problem remains and think
-"ANALYSE" again analyse the problem and get onto a solution
-"TOOL_REQUEST": use this for calling or requesting a tool. The format of output would be {"step":"TOOL_REQUEST",functionName:"getWeatherData","input":"Goa"}
-"OUTPUT" this is where we can end and give the final output to user
Rules:
- Always output one step at a time and wait for other step before proceeding
- Always maintian the sequence of pipeline as given in example
- Always follow JSON output format
- Respond with a single JSON object only. Do not output any extra text, explanation, or markdown.

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
Example:
-"USER": What is weather of Goa?
OUTPUT
-"INITIAL":"The user wants me to fetch weather information of Goa"
-"THINK":"From the tool I can see we have tool name getweatherdata which can be called"
-"ANALYSE":"We are going right we can call getWeatherDAta with "GOA" as input "
-"TOOL_REQUEST":{"FunctionName":"getWeatherData", "input":"goa"}
-"TOOL_OUTPUT": The weather of Goa is sunny with some 30 degree c.
-"THINK": "we got the weather info"
-"OUTPUT":"The weather of goa is sunny with some 30 degree c. it is gono to be hot" 

Availiable Tools:
- "getWeatherData": getWeatherData(cityName:string):Returns the realtime weather information of city
- "executeCommandOnCli" : executeCommandOnCli(command:string):Executes the command on user's device and returns output from stdout"
Output Format:
{"step": "INITIAL" | "THINK" | "TOOL_REQUEST" | "ANALYSE" | "OUPUT", "text" :"<The Actual Text>","functionName":"<Name of the function>","input":"INPUT PARAMS of FUNCTION"}
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
    let parseResult;
    try {
      parseResult = JSON.parse(rawResult);
    } catch (err) {
      console.error("Invalid JSON response from model:", err.message);
      console.error("Raw model output:", rawResult);
      break;
    }
    const stepText =
      parseResult.text ??
      (parseResult.step.toUpperCase() === "TOOL_REQUEST"
        ? `functionName=${parseResult.functionName}, input=${parseResult.input}`
        : "");
    console.log(`${parseResult.step}:${stepText}`);
    MESSAGES_DB.push({ role: "assistant", content: rawResult });
    i++;
    if (parseResult.step.toLowerCase() === "output" || i == 9) {
      break;
    }
    if (parseResult.step.toUpperCase() === "TOOL_REQUEST") {
      const { functionName, input } = parseResult;
      switch (functionName) {
        case "executeCommandOnCli":
          {
            const toolResult = await executeCommandOnCli(input);
            MESSAGES_DB.push({
              role: "developer",
              content: JSON.stringify({
                step: "TOOL_OUTPUT",
                output: toolResult,
              }),
            });
            continue;
          }
          break;
        case "getWeatherData": {
          const toolResult = await getWeatherData(input);
          MESSAGES_DB.push({
            role: "developer",
            content: JSON.stringify({
              step: "TOOL_OUTPUT",
              output: toolResult,
            }),
          });
          continue;
        }
      }
    }
  }
}
await run("what is meaning of life");
