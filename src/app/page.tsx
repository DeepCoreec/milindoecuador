// Página provisional: la portada real se construye en la fase 2, con las maquetas aprobadas.
export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-16 sm:px-8">
      <h1 className="font-rotulo text-[30px] leading-[34px] text-rio sm:text-[40px] sm:leading-[44px]">
        Mi Lindo Ecuador
      </h1>
      <p className="text-base text-rio-suave">
        Estamos construyendo la guía de Guayaquil hecha por su gente. Muy pronto podrás encontrar dónde comer,
        dónde dormir, qué visitar y dónde pasear.
      </p>
    </main>
  );
}
