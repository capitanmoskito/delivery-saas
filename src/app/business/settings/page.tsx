export default function BusinessSettingsPage() {

  return (

    <div>

      <h1 className="mb-6 text-3xl font-bold">

        Configuración del Negocio

      </h1>

      <div className="rounded border p-4">

        <ul className="space-y-2">

          <li>✅ Logo</li>

          <li>✅ Datos del negocio</li>

          <li>✅ Dirección</li>

          <li>✅ Teléfono</li>

          <li>✅ Horarios</li>

          <li>✅ Cobertura</li>

          <li>✅ Mercado Pago</li>
<select
  className="border p-2"
>

  <option>
    MXN - Peso Mexicano
  </option>

  <option>
    USD - US Dollar
  </option>

  <option>
    EUR - Euro
  </option>

  <option>
    GBP - Libra Esterlina
  </option>

  <option>
    CAD - Dólar Canadiense
  </option>

  <option>
    COP - Peso Colombiano
  </option>

  <option>
    ARS - Peso Argentino
  </option>

  <option>
    CLP - Peso Chileno
  </option>

  <option>
    PEN - Sol Peruano
  </option>

  <option>
    BRL - Real Brasileño
  </option>

</select>

        </ul>

      </div>

    </div>
  );
}