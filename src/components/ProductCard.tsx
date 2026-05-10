import { Heart, ShoppingCart, Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/data";

const ProductCard = ({ product }: { product: Product }) => (
  <Link
    to={`/product/${product.id}`}
    className="group block rounded-lg border bg-card overflow-hidden hover:shadow-lg transition-shadow"
  >
    <div className="aspect-square overflow-hidden relative">
      <img
        src={product.image}
        alt={product.title}
        loading="lazy"
        width={400}
        height={400}
        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
       onError={(e) => { const t = e.currentTarget as HTMLImageElement; if (!t.dataset.fb) { t.dataset.fb = "1"; t.src = "/placeholder.svg"; } }} />
      <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.preventDefault(); }}
          className="h-8 w-8 rounded-full bg-card/90 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <Heart className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); }}
          className="h-8 w-8 rounded-full bg-card/90 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          <ShoppingCart className="h-4 w-4" />
        </button>
      </div>
    </div>
    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-sm leading-tight">{product.title}</h3>
        <span className="text-price font-bold text-sm whitespace-nowrap">
          {product.currency}{product.price.toFixed(2)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{product.artist}</p>
      <div className="flex items-center gap-1 mt-2">
        <Star className="h-3.5 w-3.5 fill-current text-star" />
        <span className="text-xs text-muted-foreground">{product.rating}</span>
      </div>
    </div>
  </Link>
);

export default ProductCard;
