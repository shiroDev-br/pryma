<template>
  <div class="tv-safe pb-28 pt-24">
    <header class="mb-8 space-y-6">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors duration-fast hover:text-ink"
      >
        <Icon name="material-symbols:arrow-back-rounded" class="h-4 w-4" aria-hidden="true" />
        Início
      </NuxtLink>

      <div class="space-y-1.5">
        <p class="kicker">Termos de uso</p>
        <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Termo de uso e isenção de responsabilidade
        </h1>
        <p class="max-w-2xl text-sm text-ink-muted">
          Aplicativo de reprodução de conteúdo IPTV — leia atentamente antes de instalar ou
          utilizar o app.
        </p>
        <p class="text-[0.7rem] tabular-nums text-ink-muted/50">Build {{ buildId }}</p>
      </div>
    </header>

    <div class="space-y-3">
      <article
        v-for="section in sections"
        :key="section.number"
        class="rounded-md border border-line bg-surface/50 p-5"
      >
        <div class="flex items-start gap-4">
          <span
            class="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-blue/40 bg-elevated text-sm font-bold tabular-nums text-blue"
            aria-hidden="true"
          >
            {{ section.number }}
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="font-semibold uppercase tracking-[0.08em] text-ink">
              {{ section.title }}
            </h2>
            <div class="mt-2.5 space-y-3 text-sm leading-relaxed text-ink-muted">
              <p v-for="(paragraph, index) in section.paragraphs" :key="index">
                {{ paragraph }}
              </p>
            </div>
          </div>
        </div>
      </article>

      <footer class="rounded-md border border-line bg-elevated/50 p-5">
        <p class="kicker">Responsável pelo aplicativo</p>
        <dl class="mt-3 space-y-1.5 text-sm">
          <div class="flex flex-wrap gap-x-2">
            <dt class="text-ink-muted">Responsável:</dt>
            <dd class="font-semibold text-ink">Arthur Miranda</dd>
          </div>
          <div class="flex flex-wrap gap-x-2">
            <dt class="text-ink-muted">E-mail:</dt>
            <dd class="font-semibold text-ink break-all">comercialshirodev@gmail.com</dd>
          </div>
          <div class="flex flex-wrap gap-x-2">
            <dt class="text-ink-muted">Aplicativo:</dt>
            <dd class="font-semibold text-ink">Pryma</dd>
          </div>
        </dl>
        <p class="mt-4 border-t border-line/70 pt-4 text-sm leading-relaxed text-ink-muted">
          Ao utilizar o aplicativo, o usuário declara estar ciente das condições acima, sem
          prejuízo dos direitos que lhe sejam assegurados por lei.
        </p>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Pryma — Termos de uso' });

const { buildId } = useRuntimeConfig().public;

interface TermSection {
  number: number;
  title: string;
  paragraphs: string[];
}

const sections: TermSection[] = [
  {
    number: 1,
    title: 'Do objeto',
    paragraphs: [
      'O presente Termo estabelece as condições de utilização do aplicativo PRYMA, destinado exclusivamente a disponibilizar uma ferramenta tecnológica para reprodução de conteúdo audiovisual por meio de fontes e listas configuradas ou fornecidas pelo próprio usuário ou por terceiros.',
    ],
  },
  {
    number: 2,
    title: 'Da natureza do aplicativo',
    paragraphs: [
      'O aplicativo atua exclusivamente como uma ferramenta de software, não sendo, por si só, um serviço de televisão por assinatura, provedor de conteúdo audiovisual ou distribuidor de canais de televisão.',
      'Salvo quando expressamente informado em contrário, o desenvolvedor, proprietário ou responsável pelo aplicativo não fornece, hospeda, comercializa, mantém ou administra listas de canais, arquivos de mídia, links de transmissão ou servidores destinados à distribuição de conteúdo audiovisual.',
    ],
  },
  {
    number: 3,
    title: 'Das listas, dos canais e dos servidores de terceiros',
    paragraphs: [
      'O usuário declara estar ciente de que as listas de reprodução, os endereços eletrônicos, os canais, os links, as credenciais de acesso e os servidores utilizados no aplicativo podem ser disponibilizados ou administrados por terceiros independentes.',
      'O desenvolvedor e o responsável pelo aplicativo não se responsabilizam pela origem, legalidade, autorização de distribuição, disponibilidade, qualidade, estabilidade, atualização ou continuidade dos conteúdos e serviços fornecidos por terceiros que não estejam sob seu controle.',
      'O aplicativo não garante o funcionamento, a permanência ou a disponibilidade de listas, canais ou servidores externos, os quais podem ser alterados, suspensos, removidos ou desativados por seus respectivos responsáveis.',
    ],
  },
  {
    number: 4,
    title: 'Da responsabilidade do usuário',
    paragraphs: [
      'O usuário é responsável pelas listas, fontes de conteúdo, credenciais e serviços que decidir utilizar por meio do aplicativo, comprometendo-se a verificar sua procedência e a possuir as autorizações e os direitos necessários para acessar e reproduzir os conteúdos escolhidos.',
      'É vedada a utilização do aplicativo para acessar, reproduzir, distribuir ou retransmitir conteúdo em desacordo com a legislação aplicável ou com os direitos de seus respectivos titulares.',
    ],
  },
  {
    number: 5,
    title: 'Da ausência de vínculo com provedores externos',
    paragraphs: [
      'A disponibilização de funcionalidades que permitam a inserção, configuração ou reprodução de fontes externas não implica, por si só, parceria, vínculo comercial, representação, controle ou responsabilidade do desenvolvedor sobre os proprietários das listas, canais ou servidores utilizados pelo usuário.',
      'Salvo quando houver participação efetiva ou controle sobre tais serviços, o desenvolvedor não administra nem interfere nas operações dos respectivos fornecedores externos.',
    ],
  },
  {
    number: 6,
    title: 'Da limitação de responsabilidade',
    paragraphs: [
      'Na medida permitida pela legislação aplicável, o responsável pelo aplicativo não assume responsabilidade por interrupções, falhas técnicas, indisponibilidade de servidores de terceiros, alterações em listas externas, perda de acesso a conteúdos, atos praticados por fornecedores independentes ou utilização indevida do aplicativo pelo usuário.',
      'Esta disposição não exclui responsabilidades que sejam legalmente atribuídas ao desenvolvedor ou ao fornecedor do aplicativo, nem afasta direitos do consumidor ou outras garantias que não possam ser renunciadas nos termos da legislação vigente.',
    ],
  },
  {
    number: 7,
    title: 'Do uso legal do aplicativo',
    paragraphs: [
      'O usuário compromete-se a utilizar o aplicativo de maneira lícita, respeitando a legislação brasileira, os direitos autorais, os direitos de transmissão e os demais direitos de propriedade intelectual aplicáveis.',
      'O aplicativo não deve ser utilizado como instrumento para facilitar a violação de direitos autorais, a distribuição não autorizada de conteúdo protegido ou qualquer outra atividade ilícita.',
    ],
  },
  {
    number: 8,
    title: 'Da ciência e aceitação',
    paragraphs: [
      'Ao instalar, acessar ou utilizar o aplicativo, o usuário declara que leu e compreendeu as disposições deste Termo e que está ciente de que o aplicativo constitui uma ferramenta tecnológica, não representando, por si só, garantia de acesso a canais, listas ou servidores de terceiros.',
      'A aceitação deste Termo não afasta os direitos e as responsabilidades estabelecidos pela legislação aplicável.',
    ],
  },
  {
    number: 9,
    title: 'Das disposições finais',
    paragraphs: [
      'Este Termo deverá ser interpretado de acordo com a legislação brasileira. Eventuais controvérsias serão tratadas conforme as normas legais aplicáveis, respeitadas as regras de competência e os direitos legalmente assegurados às partes.',
    ],
  },
];
</script>
