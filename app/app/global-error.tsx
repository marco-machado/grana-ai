"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-50">
        <div className="flex min-h-screen flex-col items-center justify-center">
          <h1 className="text-6xl font-bold text-gray-900">Erro</h1>
          <p className="mt-4 text-lg text-gray-600">Algo deu errado</p>
          <button
            onClick={reset}
            className="mt-6 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
