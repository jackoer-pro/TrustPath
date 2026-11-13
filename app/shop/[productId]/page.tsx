import { notFound } from "next/navigation";

// ponytail: one hard-coded product until Unit 13 adds lib/shop/products.ts and the hidden instruction.
const productIds = ["aurora-anc"];

export function generateStaticParams() {
  return productIds.map((productId) => ({ productId }));
}

export default async function ShopPage({ params }: PageProps<"/shop/[productId]">) {
  const { productId } = await params;
  if (!productIds.includes(productId)) notFound();

  return (
    <div className="min-h-dvh flex-1 bg-white font-sans text-black">
      <header className="border-b border-black/10 px-6 py-4 text-lg font-bold">SoundWave Audio</header>
      <main className="mx-auto grid max-w-4xl gap-8 p-6 sm:grid-cols-2">
        <div className="aspect-square rounded bg-black/5" aria-label="Product image placeholder" />
        <div>
          <h1 className="text-2xl font-semibold">Aurora ANC Headphones</h1>
          <p className="mt-2 text-xl">$129.00</p>
          <p className="mt-4 text-black/70">Product details coming in Unit 13.</p>
        </div>
      </main>
    </div>
  );
}
