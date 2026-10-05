import { IconoBuscar } from "@/components/ui/iconos";

/** Buscador principal: envía a /buscar?q=… (funciona sin JavaScript). */
export function Buscador({ valor = "" }: { valor?: string }) {
  return (
    <form
      action="/buscar"
      method="get"
      role="search"
      className="flex w-full max-w-[640px] items-center gap-2 rounded-full border border-linea-fuerte bg-papel-alto py-1 pr-1 pl-4 text-rio-suave focus-within:shadow-[var(--anillo-foco)] [&_svg]:size-5 [&_svg]:shrink-0"
    >
      <IconoBuscar />
      <input
        type="search"
        name="q"
        defaultValue={valor}
        aria-label="Buscar lugares"
        placeholder="Encebollado, hostal, malecón…"
        maxLength={80}
        className="min-w-0 flex-1 bg-transparent py-3 text-base text-rio outline-none focus-visible:shadow-none placeholder:text-rio-suave"
      />
      <button
        type="submit"
        className="min-h-11 cursor-pointer rounded-full bg-celeste-tinta px-5 text-base font-semibold text-on-celeste-tinta"
      >
        Buscar
      </button>
    </form>
  );
}
