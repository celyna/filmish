import { Wordmark } from "@/components/brand";
import { Studio } from "@/components/studio";

export const dynamic = "force-dynamic";

export default function Home() {
  return <main><Wordmark /><Studio visionEnabled={process.env.ANALYSIS_MODE === "openai"} /></main>;
}
