import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface SkillSeed {
  name: string;
  normalizedName: string;
  aliases: string[];
  category: string;
  demandScore: number; // 0-10
  demandTrend: number; // -1 to +1
}

const SKILLS: SkillSeed[] = [
  // ─── Languages ───────────────────────────────────────────────────
  { name: "Python", normalizedName: "python", aliases: ["python3", "python 3"], category: "language", demandScore: 9.0, demandTrend: 0.3 },
  { name: "JavaScript", normalizedName: "javascript", aliases: ["js", "ecmascript", "es6", "es2015"], category: "language", demandScore: 8.5, demandTrend: 0.1 },
  { name: "TypeScript", normalizedName: "typescript", aliases: ["ts"], category: "language", demandScore: 8.8, demandTrend: 0.5 },
  { name: "Java", normalizedName: "java", aliases: ["java 17", "java 21", "jdk"], category: "language", demandScore: 7.5, demandTrend: -0.1 },
  { name: "Go", normalizedName: "go", aliases: ["golang"], category: "language", demandScore: 8.0, demandTrend: 0.4 },
  { name: "Rust", normalizedName: "rust", aliases: ["rust lang", "rustlang"], category: "language", demandScore: 7.5, demandTrend: 0.6 },
  { name: "C++", normalizedName: "c++", aliases: ["cpp", "c plus plus"], category: "language", demandScore: 6.5, demandTrend: 0.0 },
  { name: "C#", normalizedName: "c#", aliases: ["csharp", "c sharp", "dotnet", ".net"], category: "language", demandScore: 6.5, demandTrend: 0.0 },
  { name: "Kotlin", normalizedName: "kotlin", aliases: [], category: "language", demandScore: 7.0, demandTrend: 0.2 },
  { name: "Swift", normalizedName: "swift", aliases: ["swiftui"], category: "language", demandScore: 6.5, demandTrend: 0.1 },
  { name: "SQL", normalizedName: "sql", aliases: ["structured query language"], category: "language", demandScore: 7.5, demandTrend: 0.0 },
  { name: "PHP", normalizedName: "php", aliases: ["php 8"], category: "language", demandScore: 4.5, demandTrend: -0.3 },
  { name: "Ruby", normalizedName: "ruby", aliases: ["ruby on rails", "ror"], category: "language", demandScore: 4.0, demandTrend: -0.3 },
  { name: "Scala", normalizedName: "scala", aliases: [], category: "language", demandScore: 5.5, demandTrend: -0.1 },

  // ─── Frontend Frameworks ─────────────────────────────────────────
  { name: "React", normalizedName: "react", aliases: ["reactjs", "react.js", "react 19"], category: "framework", demandScore: 8.5, demandTrend: 0.2 },
  { name: "Next.js", normalizedName: "nextjs", aliases: ["next", "next.js", "next js"], category: "framework", demandScore: 8.2, demandTrend: 0.5 },
  { name: "Angular", normalizedName: "angular", aliases: ["angularjs", "angular.js"], category: "framework", demandScore: 6.0, demandTrend: -0.2 },
  { name: "Vue.js", normalizedName: "vuejs", aliases: ["vue", "vue 3", "nuxt", "nuxtjs"], category: "framework", demandScore: 6.5, demandTrend: 0.0 },
  { name: "Svelte", normalizedName: "svelte", aliases: ["sveltekit"], category: "framework", demandScore: 5.5, demandTrend: 0.3 },
  { name: "TailwindCSS", normalizedName: "tailwindcss", aliases: ["tailwind", "tailwind css"], category: "framework", demandScore: 7.5, demandTrend: 0.5 },

  // ─── Backend Frameworks ──────────────────────────────────────────
  { name: "Node.js", normalizedName: "nodejs", aliases: ["node", "node.js", "express", "expressjs", "fastify"], category: "framework", demandScore: 8.0, demandTrend: 0.1 },
  { name: "Django", normalizedName: "django", aliases: ["django rest framework", "drf"], category: "framework", demandScore: 7.0, demandTrend: 0.0 },
  { name: "FastAPI", normalizedName: "fastapi", aliases: ["fast api"], category: "framework", demandScore: 7.5, demandTrend: 0.5 },
  { name: "Spring Boot", normalizedName: "spring boot", aliases: ["spring", "spring framework", "springboot"], category: "framework", demandScore: 7.5, demandTrend: 0.0 },
  { name: "Flask", normalizedName: "flask", aliases: [], category: "framework", demandScore: 5.5, demandTrend: -0.1 },

  // ─── AI/ML ───────────────────────────────────────────────────────
  { name: "LLM Fine-tuning", normalizedName: "llm fine-tuning", aliases: ["llm finetuning", "fine tuning", "peft", "lora"], category: "concept", demandScore: 9.5, demandTrend: 0.8 },
  { name: "Prompt Engineering", normalizedName: "prompt engineering", aliases: ["prompt design", "prompting"], category: "concept", demandScore: 9.0, demandTrend: 0.7 },
  { name: "RAG", normalizedName: "rag", aliases: ["retrieval augmented generation", "retrieval-augmented generation"], category: "concept", demandScore: 9.2, demandTrend: 0.8 },
  { name: "PyTorch", normalizedName: "pytorch", aliases: ["torch"], category: "framework", demandScore: 8.5, demandTrend: 0.4 },
  { name: "TensorFlow", normalizedName: "tensorflow", aliases: ["tf", "keras"], category: "framework", demandScore: 7.0, demandTrend: -0.2 },
  { name: "LangChain", normalizedName: "langchain", aliases: ["lang chain"], category: "framework", demandScore: 8.0, demandTrend: 0.6 },
  { name: "Computer Vision", normalizedName: "computer vision", aliases: ["cv", "image recognition", "object detection"], category: "concept", demandScore: 7.5, demandTrend: 0.2 },
  { name: "NLP", normalizedName: "nlp", aliases: ["natural language processing", "text mining"], category: "concept", demandScore: 8.0, demandTrend: 0.3 },
  { name: "MLOps", normalizedName: "mlops", aliases: ["ml ops", "machine learning operations"], category: "concept", demandScore: 8.0, demandTrend: 0.5 },

  // ─── Cloud & DevOps ──────────────────────────────────────────────
  { name: "AWS", normalizedName: "aws", aliases: ["amazon web services", "ec2", "s3", "lambda"], category: "tool", demandScore: 8.5, demandTrend: 0.1 },
  { name: "Google Cloud", normalizedName: "google cloud", aliases: ["gcp", "google cloud platform"], category: "tool", demandScore: 7.5, demandTrend: 0.2 },
  { name: "Azure", normalizedName: "azure", aliases: ["microsoft azure", "azure cloud"], category: "tool", demandScore: 7.5, demandTrend: 0.2 },
  { name: "Kubernetes", normalizedName: "kubernetes", aliases: ["k8s", "container orchestration"], category: "tool", demandScore: 8.5, demandTrend: 0.3 },
  { name: "Docker", normalizedName: "docker", aliases: ["containerization", "dockerfile"], category: "tool", demandScore: 8.0, demandTrend: 0.1 },
  { name: "Terraform", normalizedName: "terraform", aliases: ["iac", "infrastructure as code", "tf"], category: "tool", demandScore: 8.0, demandTrend: 0.3 },
  { name: "CI/CD", normalizedName: "ci/cd", aliases: ["cicd", "continuous integration", "continuous deployment", "github actions", "jenkins"], category: "concept", demandScore: 7.5, demandTrend: 0.1 },

  // ─── Databases ───────────────────────────────────────────────────
  { name: "PostgreSQL", normalizedName: "postgresql", aliases: ["postgres", "psql", "pg"], category: "tool", demandScore: 8.0, demandTrend: 0.3 },
  { name: "MongoDB", normalizedName: "mongodb", aliases: ["mongo", "nosql"], category: "tool", demandScore: 6.5, demandTrend: -0.1 },
  { name: "Redis", normalizedName: "redis", aliases: ["redis cache"], category: "tool", demandScore: 7.5, demandTrend: 0.1 },
  { name: "Elasticsearch", normalizedName: "elasticsearch", aliases: ["elastic", "elk", "opensearch"], category: "tool", demandScore: 6.5, demandTrend: 0.0 },
  { name: "MySQL", normalizedName: "mysql", aliases: ["mariadb"], category: "tool", demandScore: 6.0, demandTrend: -0.1 },
  { name: "Apache Kafka", normalizedName: "apache kafka", aliases: ["kafka", "event streaming"], category: "tool", demandScore: 7.5, demandTrend: 0.2 },

  // ─── System Design ──────────────────────────────────────────────
  { name: "System Design", normalizedName: "system design", aliases: ["distributed systems", "scalability", "high availability"], category: "concept", demandScore: 8.5, demandTrend: 0.2 },
  { name: "Microservices", normalizedName: "microservices", aliases: ["micro services", "service oriented architecture", "soa"], category: "concept", demandScore: 7.5, demandTrend: 0.0 },
  { name: "REST API", normalizedName: "rest api", aliases: ["restful", "rest", "api design"], category: "concept", demandScore: 7.0, demandTrend: 0.0 },
  { name: "GraphQL", normalizedName: "graphql", aliases: ["gql"], category: "concept", demandScore: 6.5, demandTrend: -0.1 },
  { name: "gRPC", normalizedName: "grpc", aliases: ["protobuf", "protocol buffers"], category: "concept", demandScore: 7.0, demandTrend: 0.2 },

  // ─── Mobile ──────────────────────────────────────────────────────
  { name: "React Native", normalizedName: "react native", aliases: ["rn", "react-native"], category: "framework", demandScore: 6.5, demandTrend: 0.0 },
  { name: "Flutter", normalizedName: "flutter", aliases: ["dart"], category: "framework", demandScore: 6.5, demandTrend: 0.1 },

  // ─── Soft Skills (for completeness) ──────────────────────────────
  { name: "Leadership", normalizedName: "leadership", aliases: ["team leadership", "people management"], category: "soft-skill", demandScore: 7.0, demandTrend: 0.0 },
  { name: "Communication", normalizedName: "communication", aliases: ["written communication", "verbal communication"], category: "soft-skill", demandScore: 6.5, demandTrend: 0.0 },
  { name: "Agile", normalizedName: "agile", aliases: ["scrum", "kanban", "agile methodology", "sprint planning"], category: "concept", demandScore: 6.0, demandTrend: -0.1 },
  { name: "Data Structures & Algorithms", normalizedName: "data structures and algorithms", aliases: ["dsa", "algorithms", "data structures", "competitive programming"], category: "concept", demandScore: 7.0, demandTrend: 0.0 },
];

async function main() {
  console.log("Seeding skills...");

  for (const skill of SKILLS) {
    await db.skill.upsert({
      where: { normalizedName: skill.normalizedName },
      update: {
        name: skill.name,
        aliases: skill.aliases,
        category: skill.category,
        demandScore: skill.demandScore,
        demandTrend: skill.demandTrend,
      },
      create: skill,
    });
  }

  console.log(`Seeded ${SKILLS.length} skills`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
