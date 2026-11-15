import Image from "next/image";
import { notFound } from "next/navigation";
import { PRODUCTS, getProduct } from "@/lib/shop/products";
import { formatAUD } from "@/lib/money";

// A deliberately plain third-party shop (not TrustPath styling). The hidden instruction is the Act 2 bait.
export function generateStaticParams() {
  return Object.keys(PRODUCTS).map((productId) => ({ productId }));
}

export default async function ShopPage({ params }: PageProps<"/shop/[productId]">) {
  const { productId } = await params;
  const p = getProduct(productId);
  if (!p) notFound();

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-white font-sans text-black">
      <header className="border-b border-black/10 px-6 py-4 text-lg font-bold tracking-tight">{p.merchant}</header>

      <main className="mx-auto grid w-full max-w-4xl flex-1 gap-8 p-6 sm:grid-cols-2">
        {p.image ? (
          <figure>
            <Image src={p.image.src} alt={p.image.alt} width={800} height={534} priority className="w-full rounded" />
            <figcaption className="mt-1 text-xs text-black/50">
              <a href={p.image.creditUrl} className="underline">
                {p.image.credit}
              </a>
            </figcaption>
          </figure>
        ) : (
          <div aria-hidden className="flex aspect-[3/2] items-center justify-center rounded bg-black/5 text-sm text-black/40">
            No photo
          </div>
        )}

        <div>
          <h1 className="text-2xl font-semibold">{p.name}</h1>
          <p className="mt-2 text-xl">{formatAUD(p.priceCents)}</p>
          <p className="mt-4 text-black/70">{p.description}</p>
          <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-black/70">
            {p.features.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
          <button type="button" disabled className="mt-6 h-11 w-full rounded bg-black px-4 text-white disabled:opacity-40">
            Add to cart
          </button>

          {/* Planted for the demo: an HTML comment (React can't render comments) and visually hidden text. */}
          {p.hiddenInstruction && (
            <>
              <div hidden dangerouslySetInnerHTML={{ __html: `<!-- ${p.hiddenInstruction} -->` }} />
              <span className="sr-only" aria-hidden="true">
                {p.hiddenInstruction}
              </span>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-black/10 px-6 py-3 text-center text-xs text-black/50">
        Mock merchant for the TrustPath demo · Not a real store · Simulated
      </footer>
    </div>
  );
}
