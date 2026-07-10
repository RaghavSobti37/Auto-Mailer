import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const uploadRouter = {
  campaignBanner: f({
    image: {
      maxFileSize: "8MB",
      maxFileCount: 1,
    },
  })
    .middleware(async () => ({ uploadedBy: "owner" }))
    .onUploadComplete(async ({ file }) => ({
      key: file.key,
      name: file.name,
      url: file.ufsUrl || file.url,
      uploadedAt: new Date().toISOString(),
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
