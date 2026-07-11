import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pdfPath = path.resolve(__dirname, "pdf.pdf");

const loader = new PDFLoader(pdfPath);
const documents = await loader.load();

console.log(`Loaded ${documents.length} document(s) from ${pdfPath}`);

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY is not set. Export it before running this script.",
  );
  process.exit(1);
}

const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  apiKey: process.env.OPENAI_API_KEY,
});

const vectorStore = await QdrantVectorStore.fromDocuments(
  documents,
  embeddings,
  {
    url: "http://localhost:6333",
    collectionName: "my_collection",
  },
);

console.log("Documents were added to Qdrant.");
