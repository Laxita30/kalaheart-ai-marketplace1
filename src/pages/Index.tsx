import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import ArtistCard from "@/components/ArtistCard";
import heroArt from "@/assets/hero-art.jpg";
import visionArt from "@/assets/vision-artistry.jpg";
import { products, artists } from "@/lib/data";

const Index = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero */}
    <section className="bg-surface-warm">
      <div className="container py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight text-primary">
              Discover authentic local art, powered by AI
            </h1>
            <p className="mt-5 text-muted-foreground max-w-md">
              KalaHeart empowers local artisans by connecting them with a global audience, enriching lives through unique, handcrafted creations.
            </p>
            <div className="flex gap-3 mt-8">
              <Link to="/welcome">
                <Button size="lg">Get started</Button>
              </Link>
              <Link to="/browse">
                <Button variant="outline" size="lg">Browse art</Button>
              </Link>
            </div>
          </div>
          <div className="animate-fade-in [animation-delay:200ms] opacity-0">
            <img
              src={heroArt}
              alt="Vibrant handcrafted art in a gallery"
              className="rounded-xl shadow-2xl w-full object-cover aspect-[4/3]"
              width={1280}
              height={640}
            />
          </div>
        </div>
      </div>
    </section>

    {/* Vision */}
    <section id="mission" className="container py-20">
      <div className="grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-3xl font-display font-bold">Our Vision for Local Artistry</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            At KalaHeart, we believe in the timeless beauty of handcrafted art and the immense talent of local artisans. Our platform is a bridge, connecting passionate creators with art lovers worldwide, ensuring their unique stories and craftsmanship find the appreciation they deserve.
          </p>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            We harness AI to provide personalized recommendations, making art discovery effortless and joyful. By fostering a direct marketplace, we empower artisans with fair trade, sustainable practices, and the tools to thrive in the digital age.
          </p>
        </div>
        <img
          src={visionArt}
          alt="Artisan crafting pottery"
          loading="lazy"
          width={640}
          height={512}
          className="rounded-xl shadow-lg w-full object-cover aspect-[5/4]"
        />
      </div>
    </section>

    {/* Featured Products */}
    <section id="products" className="container py-16">
      <h2 className="text-3xl font-display font-bold text-center mb-10">Featured Artworks</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {products.slice(0, 8).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      <div className="text-center mt-10">
        <Link to="/browse">
          <Button variant="outline" size="lg">Browse All Products</Button>
        </Link>
      </div>
    </section>

    {/* Artisans */}
    <section id="artisans" className="bg-surface-warm py-16">
      <div className="container">
        <h2 className="text-3xl font-display font-bold text-center mb-10">Meet Our Talented Artisans</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Index;
