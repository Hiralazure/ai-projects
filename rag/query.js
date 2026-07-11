import "dotenv/config";
import OpenAI from "openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";

async function query(userQuery) {
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
    apiKey: process.env.OPENAI_API_KEY,
  });

  const vectorStore = await QdrantVectorStore.fromExistingCollection(
    embeddings,
    {
      url: process.env.QDRANT_URL || "http://localhost:6333",
      collectionName: process.env.QDRANT_COLLECTION || "my_collection",
    },
  );

  const results = await vectorStore.similaritySearch(userQuery, 5);

  const systemPrompt = `You are an expert in answering user queries based on the provided context about the document.
Do not answer anything beyond what is provided.
Always user in short and tell on page number that content is availiable.
User Documents
${results
  .map((doc) =>
    JSON.stringify({
      pageContent: doc.pageContent,
      pageNumber: doc.metadata?.loc?.pageNumber,
    }),
  )
  .join("\n\n")}`;

  console.log("SYSTEM_PROMPT:", systemPrompt);
  const client = new OpenAI();
  client.chat.completions
    .create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery },
      ],
    })
    .then((response) => {
      console.log("MODEL RESPONSE:", response.choices[0].message.content);
    });
}

query("school uniform");
