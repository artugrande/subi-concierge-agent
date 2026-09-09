# MCP de SUBI

Servidor MCP propio del proyecto. Expone el estado del padrón y del fondo, y arma
transacciones **sin firmar** para que las firme quien tenga las llaves.

No custodia nada y no pide claves privadas: las herramientas de escritura devuelven
`to` / `data` / `value` y ahí termina su trabajo.

Es deliberadamente independiente del MCP oficial de Celo: aquel es una herramienta
general de la cadena, no el lugar para los endpoints de un proyecto.

## Endpoint

```
POST /api/mcp     JSON-RPC 2.0
GET  /api/mcp     descubrimiento (nombre, herramientas, contratos)
```

## Herramientas

| Herramienta | Qué hace |
|---|---|
| `subi_status` | Saldo del treasury, tamaño del padrón, distribuible y dividendo diario por persona |
| `subi_claimable` | Cuánto tiene para cobrar una dirección ahora |
| `subi_registration` | Si una dirección está en el padrón y cuándo vence su prueba de vida |
| `subi_contracts` | Direcciones en Celo mainnet y datos de la red |
| `subi_build_deposit` | Arma el `approve` y el `deposit` sin firmar |
| `subi_build_claim` | Arma el `claim` sin firmar |

`subi_registration` no expone el nullifier: identifica al documento sin revelarlo.

## Conectarlo

En un cliente MCP que soporte servidores remotos por HTTP:

```json
{
  "mcpServers": {
    "subi": { "url": "https://<tu-deploy>/api/mcp" }
  }
}
```

## Probarlo a mano

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"subi_status","arguments":{}}}'
```

## Nota de diseño

Las herramientas de lectura pegan contra `forno.celo.org` en cada llamada, sin caché.
Para un padrón chico está bien; si el uso crece, conviene poner un RPC propio en
`CELO_RPC_URL` y cachear `subi_status` unos segundos.
