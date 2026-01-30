export class MyCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }
        .card {
          width: 200px;
          height: 300px;
          background: linear-gradient(135deg, #6e8efb, #a777e3);
          border-radius: 16px;
          display: flex;
          justify-content: center;
          align-items: center;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          /* Standard CSS Animation - Helios should sync this if it supports Shadow DOM */
          animation: float 3s ease-in-out infinite, pulse 2s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }

        @keyframes pulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.2); }
        }

        .content {
          font-size: 24px;
          font-weight: bold;
          color: white;
        }
      </style>
      <div class="card">
        <div class="content">Shadow DOM</div>
      </div>
    `;
  }
}
