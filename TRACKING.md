# Tracking: Ricardo Melo Advogados

## Implementação

O núcleo compartilhado está em `assets/js/tracking.js`, incluído com `defer` nas sete páginas HTML monitoradas. Os estilos exclusivos do aviso de privacidade estão em `assets/css/tracking.css`. Não há Google Tag Manager.

| Plataforma | Identificador |
| --- | --- |
| GA4 | `G-3435WNQZB1` |
| Google Ads | `AW-17993217235` |
| Meta Pixel | `1655339665813470` |
| Conversão institucional | `AW-17993217235/o71fCM35zYodENPp6oND` |
| Conversão LP de IR | `AW-17993217235/aA0ICMr5zYodENPp6oND` |

## Consentimento e dados

Google Analytics, Google Ads e Meta Pixel não são carregados até a autorização correspondente. A caixa permite aceitar tudo, recusar opcionais ou selecionar Analytics e Publicidade separadamente; a escolha pode ser revista no botão persistente “Preferências de cookies”. Consentimento expira em 180 dias. Revogar uma categoria atualiza o Consent Mode e remove os cookies opcionais conhecidos dessa categoria.

Sem autorização, o `lead_id` é mantido somente em memória para completar a mensagem do WhatsApp e não há persistência de identificadores/campanhas. Com autorização de uma categoria, cria-se um ID anônimo aleatório e um ID de sessão, e parâmetros de campanha permitidos são preservados na sessão. Só são aceitos `utm_*`, `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid` e `ttclid`; outros parâmetros não são repassados na localização enviada aos fornecedores. Campos não definidos são omitidos. Não se envia nome, telefone, e-mail, mensagem ou conteúdo de formulário aos pixels.

O número usado em todos os links de WhatsApp é `5511989364496`. A mensagem inclui um `lead_id` aleatório de referência (`RME-ST-*` no institucional, `RME-IR-*` na landing page), sem relação com a identidade da pessoa. Cliques de conversão iguais são deduplicados por 24 horas por página/grupo e identificador da sessão; cliques adicionais geram `whatsapp_repeat_click` no GA4, sem conversão de Ads/Meta.

## Eventos

- `page_view`: uma vez por carregamento, enviado manualmente ao GA4 após autorização de Analytics.
- `lead_site_whatsapp`: clique em WhatsApp no site institucional; Ads usa o rótulo de conversão institucional e Meta recebe o evento customizado correspondente.
- `lead_lp_isencao_ir`: clique em WhatsApp na landing de isenção; Ads usa o rótulo específico da LP e Meta recebe o evento customizado correspondente.
- `cta_click`, `view_isencao_ir`, `view_practice_area`, `faq_open`, `click_phone`, `click_email`, `click_maps` e `scroll`: eventos secundários GA4, condicionados ao consentimento de Analytics.
- `scroll` manual envia 25%, 50% e 75%. O marco de 90% deve vir do evento automático `scroll` do GA4 Enhanced Measurement, se habilitado na propriedade, evitando duplicidade no código.

Os eventos compartilham contexto de página, dispositivo e campanha e, quando disponíveis e autorizados, IDs de sessão/cliente GA4 e cookies `_fbp`/`_fbc`. Os valores de navegador e sistema operacional são categóricos, derivados do user agent, sem armazenar o user agent bruto.

## Verificação

1. Abra uma página limpa e confirme que nenhum script de `googletagmanager.com` ou `connect.facebook.net` é solicitado antes da escolha.
2. Recuse opcionais: nenhum pixel deve carregar e os links do WhatsApp devem continuar abrindo normalmente.
3. Aceite ou escolha categorias e inspecione GA4 DebugView, Google Tag Assistant/diagnóstico de conversões e Meta Events Manager > Test Events.
4. Clique em WhatsApp sem enviar a mensagem. Confirme o número, o prefixo do `lead_id`, `button_location`, grupo/página e rótulo Ads correspondente. Não usar clique de teste em produção para gerar conversões reais; prefira ambiente de teste e ferramentas oficiais.
5. Verifique `?debug_mode=true` para logs técnicos no console. A opção não deve ser usada em links de campanha reais.

Testes locais automatizados executados nesta alteração: sintaxe JavaScript, presença única dos arquivos comuns nas sete páginas, configuração dos identificadores/links e estado de consentimento inicial sem scripts de terceiros. O envio real depende das propriedades e contas externas; não foi possível confirmar recebimento no GA4, Ads ou Meta a partir deste workspace.

## Pendências antes de produção

- Publicar Política de Privacidade e informações completas sobre cookies/finalidades e responsáveis pelo tratamento; os documentos aprovados não estavam no projeto.
- Confirmar no GA4 a ativação de Enhanced Measurement > Scrolls (para 90%) e testar os dois rótulos no Tag Assistant.
- Executar validação controlada em cada conta conectada, garantindo que eventos de teste não sejam contabilizados como leads reais.

