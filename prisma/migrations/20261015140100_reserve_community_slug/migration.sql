UPDATE "Product" SET "slug" = 'community-' || substr("id", length("id") - 5) WHERE "slug" = 'community';
