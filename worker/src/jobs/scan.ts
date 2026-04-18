import { PrismaClient } from "@prisma/client";
import { fetchPortal, stripHtml } from "../../../src/lib/portals";

const prisma = new PrismaClient();

export async function scanPortal(data: { portalId?: string }) {
  const portals = data.portalId
    ? await prisma.portal.findMany({ where: { id: data.portalId, enabled: true } })
    : await prisma.portal.findMany({ where: { enabled: true } });

  for (const portal of portals) {
    try {
      const jobs = await fetchPortal(portal.kind, portal.slug);
      for (const j of jobs) {
        const plain = stripHtml(j.description).slice(0, 12_000);
        await prisma.job.upsert({
          where: { url: j.url },
          create: {
            url: j.url,
            company: portal.company,
            title: j.title,
            location: j.location,
            remote: j.remote,
            description: plain,
            source: portal.kind,
            portalId: portal.id,
          },
          update: {
            title: j.title,
            location: j.location,
            remote: j.remote,
            description: plain,
          },
        });
      }
      await prisma.portal.update({
        where: { id: portal.id },
        data: { lastScan: new Date() },
      });
      console.log(`[scan] ${portal.company} (${portal.kind}): ${jobs.length} jobs`);
    } catch (err) {
      console.error(`[scan] ${portal.company} failed:`, err);
    }
  }
}
