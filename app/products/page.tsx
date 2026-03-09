import type { Metadata } from "next";
import { Container } from "@/components/Container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { StockcountProject } from "@/components/StockcountProject";
import { JsonLd } from "@/components/JsonLd";
import { softwareApplicationJsonLd } from "@/lib/structured-data";
import { SITE } from "@/lib/metadata";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Tools built by Jeremy Dudet. Stockcount — voice-powered inventory management for F&B.",
  openGraph: {
    title: "Projects | Jeremy Dudet",
    description: "Tools built by Jeremy Dudet.",
    url: `${SITE.url}/products`,
  },
  alternates: {
    canonical: `${SITE.url}/products`,
  },
};

export default function Products() {
  return (
    <>
      <JsonLd data={softwareApplicationJsonLd()} />
      <Container>
        <Heading level={1}>Projects</Heading>
        <Text className="mt-2">Tools I&apos;m building.</Text>

        <div className="mt-12">
          <StockcountProject />
        </div>
      </Container>
    </>
  );
}
