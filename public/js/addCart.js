// public/js/cart.js
import { addToCart, updateCartQuantity } from './localStorage-cart.js';

document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Cart Icon and Quantity Elements
    const cartIcon = document.getElementById('js-cart');
    const cartQuantity = cartIcon ? cartIcon.querySelector('#js-cart-quantity') : null;

    if (!cartIcon || !cartQuantity) {
      console.warn("Cart icon or quantity element not found, skipping cart functionality.");
      return;
    }

    // Initial cart quantity update
    await updateCartQuantity();

    // Handle Quick View button clicks
    const quickViewButtons = document.querySelectorAll(".quick-view-btn");
    if (quickViewButtons.length === 0) {
      console.warn("No quick view buttons found, skipping setup.");
    } else {
      quickViewButtons.forEach(button => {
        button.addEventListener("click", function () {
          try {
            const productId = this.dataset.productId;
            const quantity = this.dataset.quantity; // Get quantity from quick-view-btn
            const modal = document.getElementById("quickViewModal");
            const addToCartModalBtn = modal.querySelector(".add-to-cart-btn-modal");

            if (!productId) {
              console.error("Product ID not found in quick view button data.");
              return;
            }

            // Set product ID and quantity on the modal's Add to Cart button
            addToCartModalBtn.dataset.productId = productId;
            addToCartModalBtn.dataset.quantity = quantity; // Pass quantity to modal button

            // Populate modal content
            document.getElementById("modalProductName").textContent = this.dataset.name || "Unknown Product";
            document.getElementById("modalProductImage").src = this.dataset.image || "";
            document.getElementById("modalProductPrice").textContent = `Rs ${this.dataset.price || '0'}`;
            document.getElementById("modalProductOldPrice").textContent = `Rs ${this.dataset.discountprice || '0'}`;
            document.getElementById("modalProductDesc").textContent = this.dataset.description || "No description available.";

            // Show modal
            modal.classList.remove("opacity-0", "pointer-events-none");
            modal.classList.add("opacity-100", "pointer-events-auto");
            modal.querySelector('.bg-\\[var\\(--color-white\\)\\]').classList.remove('scale-95');
            modal.querySelector('.bg-\\[var\\(--color-white\\)\\]').classList.add('scale-100');
            document.body.style.overflow = 'hidden';
          } catch (error) {
            console.error("Error opening quick view modal:", error);
          }
        });
      });
    }

    // Function to show custom message
    function showMessage(text) {
      let messageBox = document.getElementById('cart-message-box');
      if (messageBox) {
        messageBox.remove(); // Remove existing message if present
      }

      messageBox = document.createElement('div');
      messageBox.id = 'cart-message-box';
      messageBox.textContent = text;
      messageBox.className = `
        fixed top-[12%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 
        bg-gradient-to-r from-red-500 to-red-700 text-white text-center font-medium 
        px-4 py-2 rounded-lg shadow-lg card-shadow animate-fade-in z-[1000] 
        whitespace-nowrap overflow-hidden text-ellipsis max-w-[90vw]
      `;
      document.body.appendChild(messageBox);

      // Fade out and remove after 2 seconds
      setTimeout(() => {
        messageBox.classList.remove('animate-fade-in');
        messageBox.classList.add('animate-fade-out');
        setTimeout(() => messageBox.remove(), 500); // Match fade-out duration
      }, 2000);
    }

    // Handle Add to Cart from Product Cards
    const cartButtons = document.querySelectorAll(".add-to-cart-btn");
    if (cartButtons.length === 0) {
      console.warn("No add-to-cart buttons found on product cards, skipping setup.");
    } else {
      cartButtons.forEach(button => {
        button.addEventListener("click", async function () {
          try {
            const productId = this.dataset.productId;
            const quantity = parseInt(this.dataset.quantity, 10); // Get quantity from data attribute

            if (!productId) {
              console.error("Product ID not found in add-to-cart button data.");
              showMessage("Error: Product ID is missing.");
              return;
            }

            // Check if product is out of stock
            if (quantity === 0) {
              showMessage("This product is out of stock!");
              return;
            }

            const response = await fetch("/user/cart/add", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ productId }),
              credentials: "include"
            });
            const data = await response.json();

            if (data.success) {
              const price = data.cart.items.find(item => item.product.toString() === productId)?.price || 0;
              await addToCart(productId, 1, price);
              await updateCartQuantity();
            } else {
              console.error("Server error adding to cart from product card:", data.message);
              if (data.message === "Please log in to add items to your cart." || data.success === "false") {
                showMessage("Please log in first to add items to your cart");
              } else {
                showMessage(data.message || "Failed to add item to cart");
              }
            }
          } catch (error) {
            console.error("Error in cart button click handler for product card:", error);
            showMessage("An error occurred while adding to cart");
          }
        });
      });
    }

    // Handle Add to Cart from Quick View Modal
    const addToCartModalBtn = document.querySelector(".add-to-cart-btn-modal");
    if (addToCartModalBtn) {
      addToCartModalBtn.addEventListener("click", async function () {
        try {
          const productId = this.dataset.productId;
          const quantity = parseInt(this.dataset.quantity, 10);

          if (!productId) {
            console.error("Product ID not found in Quick View modal button data.");
            showMessage("Error: Product ID is missing.");
            return;
          }

          // Check if product is out of stock
          if (quantity === 0) {
            showMessage("This product is out of stock!");
            closeQuickView(); // Auto-close modal on success
            return;
          }

          const response = await fetch("/user/cart/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
            credentials: "include"
          });
          const data = await response.json();

          if (data.success) {
            const price = data.cart.items.find(item => item.product.toString() === productId)?.price || 0;
            await addToCart(productId, 1, price);
            await updateCartQuantity();
            closeQuickView(); // Auto-close modal on success
          } else {
            console.error("Server error adding to cart from quick view:", data.message);
            if (data.message === "Please log in to add items to your cart." || data.success === "false") {
              showMessage("Please log in first to add items to your cart");
              closeQuickView(); // Auto-close modal on success
            } else {
              showMessage(data.message || "Failed to add item to cart");
            }
          }
        } catch (error) {
          console.error("Error in add to cart from quick view modal:", error);
          showMessage("An error occurred while adding to cart");
        }
      });
    } else {
      console.warn("Add to cart button in quick view modal not found.");
    }

    // Close Quick View Function
    function closeQuickView() {
      try {
        const modal = document.getElementById("quickViewModal");
        modal.classList.remove("opacity-100", "pointer-events-auto");
        modal.classList.add("opacity-0", "pointer-events-none");
        modal.querySelector('.bg-\\[var\\(--color-white\\)\\]').classList.remove('scale-100');
        modal.querySelector('.bg-\\[var\\(--color-white\\)\\]').classList.add('scale-95');
        document.body.style.overflow = 'auto';
      } catch (error) {
        console.error("Error closing quick view modal:", error);
      }
    }

    // Add close button functionality
    const closeModalBtn = document.getElementById("closeQuickViewBtn");
    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", closeQuickView);
    }

    // Re-sync cart quantity on focus
    window.addEventListener("focus", async () => {
      try {
        await updateCartQuantity();
      } catch (error) {
        console.error("Error updating cart quantity on focus:", error);
      }
    });
  } catch (error) {
    console.error("Error initializing cart functionality:", error);
  }
});