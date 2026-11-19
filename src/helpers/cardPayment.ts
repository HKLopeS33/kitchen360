export type CardResult = { status: string; statusDetail: string };

/** Mensagem para o cliente a partir do status_detail do Mercado Pago. */
export function cardResultMessage(r: CardResult): string {
  if (r.status === 'approved') return 'Pagamento aprovado!';
  if (r.status === 'in_process' || r.status === 'pending') {
    return 'Pagamento em análise. Avisaremos assim que for aprovado — isso costuma levar poucos minutos.';
  }
  const map: Record<string, string> = {
    cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente. Tente outro cartão ou pague com Pix.',
    cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) incorreto.',
    cc_rejected_bad_filled_date: 'Data de validade incorreta.',
    cc_rejected_bad_filled_card_number: 'Número do cartão incorreto.',
    cc_rejected_bad_filled_other: 'Confira os dados do cartão e tente de novo.',
    cc_rejected_call_for_authorize: 'O banco pediu autorização. Ligue para o banco do cartão ou use outro cartão.',
    cc_rejected_card_disabled: 'Cartão bloqueado ou não ativado. Fale com o banco ou use outro cartão.',
    cc_rejected_duplicated_payment: 'Pagamento duplicado: você já fez um pagamento igual há pouco.',
    cc_rejected_high_risk: 'Pagamento recusado pela análise de segurança. Tente outro cartão ou pague com Pix.',
    cc_rejected_max_attempts: 'Limite de tentativas atingido. Use outro cartão ou pague com Pix.',
    cc_rejected_card_error: 'Não foi possível processar este cartão. Tente outro.',
    cc_rejected_blacklist: 'Este cartão não pode ser usado. Tente outro ou pague com Pix.',
  };
  const text = map[r.statusDetail] ?? 'Pagamento recusado. Confira os dados ou tente outro cartão.';
  // Código do Mercado Pago no fim, para o suporte saber o motivo exato.
  return r.statusDetail ? `${text} (código: ${r.statusDetail})` : text;
}
