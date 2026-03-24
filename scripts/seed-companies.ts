import { PrismaClient, CompanyTier } from "@prisma/client";

const db = new PrismaClient();

/**
 * Seed the Companies reference table.
 * This is the authoritative list of companies with tier assignments.
 * Additional companies will be added via AI normalization at runtime.
 *
 * Tier criteria:
 * S: Elite — global tech leaders, top brand, best compensation
 * A: Top — major tech companies, unicorns, strong brand
 * B: Strong — well-known product companies, late-stage startups
 * C: Good — large IT services, mid-tier product companies
 * D: Entry — small service companies, early startups, unknown
 */

interface CompanySeed {
  name: string;
  normalizedName: string;
  aliases: string[];
  tier: CompanyTier;
  tierScore: number;
  industry: string;
  sizeBand?: string;
  headquarters?: string;
}

const COMPANIES: CompanySeed[] = [
  // ─── S Tier (Elite) ──────────────────────────────────────────────
  { name: "Google", normalizedName: "google", aliases: ["alphabet", "google llc", "google india"], tier: "S", tierScore: 1.0, industry: "AI / Machine Learning", sizeBand: "10000+", headquarters: "Mountain View, CA" },
  { name: "Apple", normalizedName: "apple", aliases: ["apple inc", "apple india"], tier: "S", tierScore: 1.0, industry: "SaaS / Cloud", sizeBand: "10000+", headquarters: "Cupertino, CA" },
  { name: "Meta", normalizedName: "meta", aliases: ["facebook", "meta platforms", "fb", "instagram", "whatsapp"], tier: "S", tierScore: 0.98, industry: "SaaS / Cloud", sizeBand: "10000+", headquarters: "Menlo Park, CA" },
  { name: "Netflix", normalizedName: "netflix", aliases: ["netflix inc"], tier: "S", tierScore: 0.97, industry: "Media / Entertainment", sizeBand: "10000+", headquarters: "Los Gatos, CA" },
  { name: "OpenAI", normalizedName: "openai", aliases: ["open ai"], tier: "S", tierScore: 1.0, industry: "AI / Machine Learning", sizeBand: "1000-5000", headquarters: "San Francisco, CA" },
  { name: "DeepMind", normalizedName: "deepmind", aliases: ["google deepmind"], tier: "S", tierScore: 0.99, industry: "AI / Machine Learning", sizeBand: "1000-5000", headquarters: "London, UK" },
  { name: "Nvidia", normalizedName: "nvidia", aliases: ["nvidia corporation"], tier: "S", tierScore: 0.99, industry: "AI / Machine Learning", sizeBand: "10000+", headquarters: "Santa Clara, CA" },
  { name: "Anthropic", normalizedName: "anthropic", aliases: [], tier: "S", tierScore: 0.98, industry: "AI / Machine Learning", sizeBand: "500-1000", headquarters: "San Francisco, CA" },

  // ─── A Tier (Top) ────────────────────────────────────────────────
  { name: "Amazon", normalizedName: "amazon", aliases: ["aws", "amazon web services", "amazon india", "amazon.com"], tier: "A", tierScore: 0.90, industry: "E-Commerce", sizeBand: "10000+", headquarters: "Seattle, WA" },
  { name: "Microsoft", normalizedName: "microsoft", aliases: ["msft", "microsoft india", "microsoft corporation", "linkedin"], tier: "A", tierScore: 0.92, industry: "SaaS / Cloud", sizeBand: "10000+", headquarters: "Redmond, WA" },
  { name: "Uber", normalizedName: "uber", aliases: ["uber technologies", "uber india"], tier: "A", tierScore: 0.85, industry: "Logistics / Supply Chain", sizeBand: "10000+", headquarters: "San Francisco, CA" },
  { name: "Stripe", normalizedName: "stripe", aliases: ["stripe inc"], tier: "A", tierScore: 0.90, industry: "Fintech", sizeBand: "5000-10000", headquarters: "San Francisco, CA" },
  { name: "Flipkart", normalizedName: "flipkart", aliases: ["flipkart internet", "myntra", "flipkart india"], tier: "A", tierScore: 0.85, industry: "E-Commerce", sizeBand: "10000+", headquarters: "Bangalore" },
  { name: "Salesforce", normalizedName: "salesforce", aliases: ["salesforce.com", "sfdc"], tier: "A", tierScore: 0.87, industry: "SaaS / Cloud", sizeBand: "10000+", headquarters: "San Francisco, CA" },
  { name: "Goldman Sachs", normalizedName: "goldman sachs", aliases: ["gs", "goldman"], tier: "A", tierScore: 0.88, industry: "BFSI", sizeBand: "10000+", headquarters: "New York, NY" },
  { name: "Tower Research Capital", normalizedName: "tower research capital", aliases: ["tower research", "trc"], tier: "A", tierScore: 0.86, industry: "BFSI", sizeBand: "500-1000", headquarters: "New York, NY" },
  { name: "DE Shaw", normalizedName: "de shaw", aliases: ["d e shaw", "deshaw", "de shaw & co"], tier: "A", tierScore: 0.88, industry: "BFSI", sizeBand: "1000-5000", headquarters: "New York, NY" },
  { name: "Databricks", normalizedName: "databricks", aliases: [], tier: "A", tierScore: 0.88, industry: "AI / Machine Learning", sizeBand: "5000-10000", headquarters: "San Francisco, CA" },
  { name: "Snowflake", normalizedName: "snowflake", aliases: ["snowflake inc"], tier: "A", tierScore: 0.85, industry: "SaaS / Cloud", sizeBand: "5000-10000", headquarters: "Bozeman, MT" },

  // ─── B Tier (Strong) ─────────────────────────────────────────────
  { name: "Swiggy", normalizedName: "swiggy", aliases: ["bundl technologies"], tier: "B", tierScore: 0.78, industry: "E-Commerce", sizeBand: "5000-10000", headquarters: "Bangalore" },
  { name: "Razorpay", normalizedName: "razorpay", aliases: ["razorpay software"], tier: "B", tierScore: 0.80, industry: "Fintech", sizeBand: "1000-5000", headquarters: "Bangalore" },
  { name: "PhonePe", normalizedName: "phonepe", aliases: ["phone pe"], tier: "B", tierScore: 0.78, industry: "Fintech", sizeBand: "5000-10000", headquarters: "Bangalore" },
  { name: "Atlassian", normalizedName: "atlassian", aliases: ["atlassian corporation"], tier: "B", tierScore: 0.82, industry: "SaaS / Cloud", sizeBand: "10000+", headquarters: "Sydney, AU" },
  { name: "Adobe", normalizedName: "adobe", aliases: ["adobe inc", "adobe systems"], tier: "B", tierScore: 0.83, industry: "SaaS / Cloud", sizeBand: "10000+", headquarters: "San Jose, CA" },
  { name: "Zomato", normalizedName: "zomato", aliases: ["zomato media", "blinkit"], tier: "B", tierScore: 0.76, industry: "E-Commerce", sizeBand: "5000-10000", headquarters: "Gurugram" },
  { name: "Paytm", normalizedName: "paytm", aliases: ["one97 communications", "paytm payments"], tier: "B", tierScore: 0.72, industry: "Fintech", sizeBand: "5000-10000", headquarters: "Noida" },
  { name: "CRED", normalizedName: "cred", aliases: ["dreamplug technologies"], tier: "B", tierScore: 0.78, industry: "Fintech", sizeBand: "500-1000", headquarters: "Bangalore" },
  { name: "Zerodha", normalizedName: "zerodha", aliases: ["zerodha broking"], tier: "B", tierScore: 0.77, industry: "Fintech", sizeBand: "1000-5000", headquarters: "Bangalore" },
  { name: "Meesho", normalizedName: "meesho", aliases: ["fashnear technologies"], tier: "B", tierScore: 0.72, industry: "E-Commerce", sizeBand: "1000-5000", headquarters: "Bangalore" },
  { name: "Freshworks", normalizedName: "freshworks", aliases: ["freshworks inc", "freshdesk"], tier: "B", tierScore: 0.78, industry: "SaaS / Cloud", sizeBand: "5000-10000", headquarters: "Chennai" },
  { name: "Postman", normalizedName: "postman", aliases: ["postman inc"], tier: "B", tierScore: 0.80, industry: "SaaS / Cloud", sizeBand: "500-1000", headquarters: "San Francisco, CA" },
  { name: "Browserstack", normalizedName: "browserstack", aliases: ["browser stack"], tier: "B", tierScore: 0.78, industry: "SaaS / Cloud", sizeBand: "500-1000", headquarters: "Mumbai" },
  { name: "Ola", normalizedName: "ola", aliases: ["ani technologies", "ola cabs", "ola electric"], tier: "B", tierScore: 0.72, industry: "Automotive / EV", sizeBand: "5000-10000", headquarters: "Bangalore" },

  // ─── C Tier (Good) ───────────────────────────────────────────────
  { name: "TCS", normalizedName: "tcs", aliases: ["tata consultancy services", "tata consultancy", "tcs digital"], tier: "C", tierScore: 0.65, industry: "IT Services", sizeBand: "10000+", headquarters: "Mumbai" },
  { name: "Infosys", normalizedName: "infosys", aliases: ["infosys limited", "infosys ltd", "infosys bpm"], tier: "C", tierScore: 0.65, industry: "IT Services", sizeBand: "10000+", headquarters: "Bangalore" },
  { name: "Wipro", normalizedName: "wipro", aliases: ["wipro limited", "wipro ltd", "wipro technologies"], tier: "C", tierScore: 0.63, industry: "IT Services", sizeBand: "10000+", headquarters: "Bangalore" },
  { name: "HCL Technologies", normalizedName: "hcl technologies", aliases: ["hcl", "hcltech", "hcl tech"], tier: "C", tierScore: 0.63, industry: "IT Services", sizeBand: "10000+", headquarters: "Noida" },
  { name: "Tech Mahindra", normalizedName: "tech mahindra", aliases: ["tech mahindra limited"], tier: "C", tierScore: 0.60, industry: "IT Services", sizeBand: "10000+", headquarters: "Pune" },
  { name: "Cognizant", normalizedName: "cognizant", aliases: ["cognizant technology solutions", "cts"], tier: "C", tierScore: 0.62, industry: "IT Services", sizeBand: "10000+", headquarters: "Teaneck, NJ" },
  { name: "Capgemini", normalizedName: "capgemini", aliases: ["capgemini technology"], tier: "C", tierScore: 0.62, industry: "IT Services", sizeBand: "10000+", headquarters: "Paris, FR" },
  { name: "LTIMindtree", normalizedName: "ltimindtree", aliases: ["lti", "mindtree", "l&t infotech"], tier: "C", tierScore: 0.60, industry: "IT Services", sizeBand: "10000+", headquarters: "Mumbai" },
  { name: "Accenture", normalizedName: "accenture", aliases: ["accenture india", "accenture solutions"], tier: "C", tierScore: 0.65, industry: "Consulting", sizeBand: "10000+", headquarters: "Dublin, IE" },
  { name: "Deloitte", normalizedName: "deloitte", aliases: ["deloitte consulting", "deloitte india", "deloitte usi"], tier: "C", tierScore: 0.67, industry: "Consulting", sizeBand: "10000+", headquarters: "London, UK" },

  // ─── D Tier (Entry) ──────────────────────────────────────────────
  { name: "Unknown", normalizedName: "unknown", aliases: [], tier: "D", tierScore: 0.50, industry: "IT Services", sizeBand: "unknown" },
];

async function main() {
  console.log("Seeding companies...");

  for (const company of COMPANIES) {
    await db.company.upsert({
      where: { normalizedName: company.normalizedName },
      update: {
        name: company.name,
        aliases: company.aliases,
        tier: company.tier,
        tierScore: company.tierScore,
        industry: company.industry,
        sizeBand: company.sizeBand,
        headquarters: company.headquarters,
      },
      create: company,
    });
  }

  console.log(`Seeded ${COMPANIES.length} companies`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
