import {Link} from "react-router-dom";

export default function NotFound() {
  return (
    <div className="relative min-h-screen bg-white flex items-center justify-center overflow-hidden px-8">

      {/* Filigrane */}
      <span
        className="absolute select-none text-gray-100 font-black pointer-events-none"
        style={{
          fontSize: "320px",
          letterSpacing: "-20px",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -52%)",
          fontFamily: "'Black Han Sans', sans-serif",
          whiteSpace: "nowrap",
        }}
        aria-hidden="true"
      >
        404
      </span>

      {/* Contenu */}
      <div className="relative z-10 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-gray-400 mb-2">
          Erreur
        </p>

        <h1
          className="text-red-500 leading-none"
          style={{
            fontSize: "150px",
            letterSpacing: "-4px",
            fontFamily: "'Black Han Sans', sans-serif",
          }}
        >
          404
        </h1>

        <div className="w-20 h-1 bg-red-500 mx-auto my-6" />

        <h2
          className="text-gray-900 text-3xl mb-4"
          style={{ fontFamily: "'Black Han Sans', sans-serif" }}
        >
          Page introuvable
        </h2>

        <p className="font-mono text-xs text-gray-400 leading-relaxed max-w-xs mx-auto mb-8">
          La page que vous cherchez n'existe pas ou a été déplacée vers un autre endroit.
        </p>

          <Link to="/"
          className="inline-block font-mono text-xs uppercase tracking-widest px-7 py-3 bg-red-500 text-white border-2 border-red-500 transition-colors duration-200 hover:bg-red-600 hover:border-red-600"
        >
          ← Retour accueil
          </Link>
      </div>
    </div>
  );
}
