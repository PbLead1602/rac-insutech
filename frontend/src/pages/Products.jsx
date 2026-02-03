import React, { useEffect } from "react";
import products from "../data/products";

function Products() {
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const element = document.getElementById(hash);
      element?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div className="product-page-wrapper">
      <div className="container">
      <h2 className="section-title">Our Product Range</h2>

      {products.map((product, index) => (
        <section
          id={product.id}
          key={product.id}
          className="product-detail my-5"
        >
          <div className="row align-items-center">
            <div className={`col-md-6 ${index % 2 !== 0 && "order-md-2"}`}>
              <img
                src={product.image}
                alt={product.name}
                className="img-fluid rounded shadow"
              />
            </div>

            <div className="col-md-6">
              <h3>{product.name}</h3>
              <p>{product.description}</p>

              <h5>Features</h5>
              <ul>
                {product.features.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>

              <h5>Applications</h5>
              <ul>
                {product.applications.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>

              <h5>Ideal For</h5>
              <ul>
                {product.idealFor.map((iF, i) => (
                  <li key={i}>{iF}</li>
                ))}
              </ul>

              <h5>Availability</h5>
              <ul>
                {product.availability.map((av, i) => (
                  <li key={i}>{av}</li>
                ))}
              </ul>
            </div>
          </div>
          <hr />
        </section>
      ))}
    </div>
    </div>
    
  );
}

export default Products;
