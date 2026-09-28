# Ricardo Melo Advogados

Site institucional estático em HTML, CSS e JavaScript, preparado para versionamento em Git e publicação no GitHub Pages.

## Estrutura

- `index.html`: página inicial institucional.
- `escritorio/`: apresentação, missão, visão e princípios.
- `atuacao/`: áreas de atuação e seus serviços.
- `equipe/`: apresentação do advogado responsável.
- `noticias/`: área editorial.
- `contato/`: endereço, telefone, e-mail e WhatsApp.
- `isencao-ir-aposentados/`: landing page da campanha de isenção de IR.
- `assets/images/`: imagens WebP utilizadas nas páginas.
- `site.css` e `site.js`: estilos e interações do site institucional.
- `style.css` e `script.js`: estilos e interações da landing page de IR.

## Publicação no GitHub Pages

1. Crie ou selecione um repositório GitHub e envie os arquivos deste diretório.
2. Em Settings > Pages, selecione a publicação a partir da branch principal e da raiz (`/`).
3. Para publicar em domínio próprio, configure o domínio e os registros DNS no GitHub Pages e no provedor de DNS. Não há `CNAME` incluído, pois a migração do domínio atual depende da configuração aprovada pelo responsável.

O projeto não requer Node, compilação ou dependências. Os diretórios `work/` e `outputs/` contêm materiais locais de auditoria/entrega e são excluídos do Git. Os arquivos-fonte JPG/PNG são mantidos no projeto, mas ignorados pelo Git; a publicação utiliza as versões WebP.

## Conteúdo a confirmar antes da publicação

- Completar a página Notícias com artigos aprovados e respectivas datas/autoria. O site público não forneceu conteúdo verificável dessa seção durante a auditoria.
- Confirmar a composição e os perfis da Equipe. A página pública encontrada não estava disponível para leitura; a versão estática apresenta apenas os dados do responsável que já constam no material do projeto.
- Revisar as áreas Penal e Defesa da Mulher, exibidas na navegação pública, e confirmar escopo/texto da apresentação institucional.
- Fornecer conteúdo aprovado de Política de Privacidade e Termos de Uso. Esses documentos não foram copiados nem redigidos sem validação do escritório.
- Confirmar qual número de WhatsApp deve ser o canal geral: o site institucional publicado apresenta (11) 98936-4496; a landing de IR já configurada utiliza outro número.
- Revisar endereço e contatos antes de apontar o DNS para a hospedagem nova.

## Nota editorial

O conteúdo foi reorganizado em páginas HTML estáticas com base no material local da landing page e no conteúdo público indexado do site institucional. Algumas seções do site de origem não puderam ser verificadas integralmente. Não foram inventados artigos, nomes de integrantes adicionais ou políticas legais.
