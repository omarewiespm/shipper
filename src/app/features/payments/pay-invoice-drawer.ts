import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { Invoice } from '../../models';
import { Icon } from '../../shared/ui';

type MethodId = 'card' | 'wallet' | 'tabby' | 'tamara';
const WALLET_BALANCE = 12400;
interface SavedCard { id: string; brand: 'visa' | 'mastercard'; last4: string; exp: string; }
const SAVED_CARDS: SavedCard[] = [
  { id: 'c1', brand: 'visa', last4: '4291', exp: '08 / 27' },
  { id: 'c2', brand: 'mastercard', last4: '8830', exp: '02 / 26' },
];
function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function split(total: number, n: number): number[] {
  const each = Math.floor(total / n);
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? total - each * (n - 1) : each));
}

/** Checkout drawer — bill breakdown, modern method tiles, card form, and a success state. Mock UI. */
@Component({
  selector: 'app-pay-invoice-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon],
  template: `
    @if (invoice(); as inv) {
      <div class="sd-scrim" (click)="closed.emit()"></div>
      <aside class="sd pid" role="dialog" aria-modal="true" [attr.aria-label]="'Pay ' + inv.id"
        cdkTrapFocus [cdkTrapFocusAutoCapture]="true" (keydown.escape)="closed.emit()">

        @if (stage() === 'success') {
          <!-- ===== SUCCESS ===== -->
          <button class="pid__x" type="button" aria-label="Close" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
          <div class="ok">
            <span class="ok__badge"><app-icon name="check" [size]="38" /></span>
            <h2 class="ok__t">Payment successful</h2>
            <p class="ok__s">SAR {{ fmt(bill()?.total ?? 0) }} paid for invoice {{ inv.id }}</p>
            <div class="ok__meta">
              <div class="ok__row"><span>Paid with</span><b>{{ methodLabel() }}</b></div>
              <div class="ok__row"><span>Reference</span><b class="tabular">{{ payRef() }}</b></div>
              <div class="ok__row"><span>Date</span><b>{{ today() }}</b></div>
            </div>
            <button class="pid__btn" type="button" (click)="closed.emit()">Done</button>
          </div>
        } @else if (bill(); as b) {
          <!-- ===== CHECKOUT ===== -->
          <header class="sd__head">
            <span class="sd__title">Payment - <span class="tabular">{{ inv.id }}</span></span>
            <button class="sd__close" type="button" aria-label="Close" (click)="closed.emit()"><app-icon name="x" [size]="18" /></button>
          </header>

          <div class="sd__body pid__body">
            <!-- Bill breakdown -->
            <div class="bill">
              <div class="bill__ship"><span>Shipment</span><b class="tabular">{{ b.shipmentId }}</b></div>
              <div class="bill__row"><span>Amount</span><b class="tabular">SAR {{ fmt(b.amount) }}</b></div>
              <div class="bill__row"><span>Waiting charge</span><b class="tabular">SAR {{ fmt(b.waiting) }}</b></div>
              <div class="bill__row"><span>VAT (15%)</span><b class="tabular">SAR {{ fmt(b.vat) }}</b></div>
              <div class="bill__total"><span>Total</span><b class="tabular">SAR {{ fmt(b.total) }}</b></div>
            </div>

            <!-- Method tiles -->
            <span class="pid__label">Pay with</span>
            <div class="tiles">
              <button class="tile" type="button" [class.is-on]="method() === 'card'" (click)="method.set('card')">
                <svg class="tile__card" viewBox="0 0 32 22" width="30" height="21" aria-hidden="true"><rect x="1" y="1.5" width="30" height="19" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="1" y="5.5" width="30" height="3.5" fill="currentColor"/></svg>
                <span class="tile__lb">Card</span>
              </button>
              <button class="tile" type="button" [class.is-on]="method() === 'wallet'" (click)="method.set('wallet')">
                <app-icon name="wallet" [size]="22" class="tile__card" />
                <span class="tile__lb">Wallet</span>
              </button>
              <button class="tile" type="button" [class.is-on]="method() === 'tabby'" (click)="method.set('tabby')">
                <img class="tile__logo" src="/brand/tabby_logo.webp" alt="Tabby" />
              </button>
              <button class="tile" type="button" [class.is-on]="method() === 'tamara'" (click)="method.set('tamara')">
                <img class="tile__logo" src="/brand/tamara.png" alt="Tamara" />
              </button>
            </div>

            <!-- Contextual content -->
            @if (method() === 'card') {
              <div class="cards">
                @for (c of savedCards; track c.id) {
                  <button class="scard" type="button" [class.is-on]="cardSel() === c.id" (click)="cardSel.set(c.id)">
                    <span class="scard__logo">
                      @if (c.brand === 'visa') { <span class="wm wm--visa">VISA</span> }
                      @else { <svg viewBox="0 0 40 25" width="24" height="15" aria-hidden="true"><circle cx="15" cy="12.5" r="9.5" fill="#EB001B"/><circle cx="25" cy="12.5" r="9.5" fill="#F79E1B"/><path d="M20 5.2a9.5 9.5 0 0 0 0 14.6 9.5 9.5 0 0 0 0-14.6Z" fill="#FF5F00"/></svg> }
                    </span>
                    <span class="scard__body"><span class="scard__n tabular">•••• {{ c.last4 }}</span><span class="scard__x">Expires {{ c.exp }}</span></span>
                  </button>
                }
                <button class="scard scard--add" type="button" [class.is-on]="cardSel() === 'new'" (click)="cardSel.set('new')">
                  <span class="scard__logo scard__logo--add"><app-icon name="plus" [size]="16" /></span>
                  <span class="scard__body"><span class="scard__n">Add new card</span></span>
                </button>

                @if (cardSel() === 'new') {
                  <div class="cardform">
                    <label class="fld fld--full">
                      <span>Card number</span>
                      <div class="fld__wrap">
                        <input inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" [value]="cardNumber()" (input)="onCard($event)" />
                        <span class="fld__accept" aria-hidden="true"><span class="wm wm--visa">VISA</span><svg viewBox="0 0 40 25" width="22" height="14"><circle cx="15" cy="12.5" r="9.5" fill="#EB001B"/><circle cx="25" cy="12.5" r="9.5" fill="#F79E1B"/><path d="M20 5.2a9.5 9.5 0 0 0 0 14.6 9.5 9.5 0 0 0 0-14.6Z" fill="#FF5F00"/></svg></span>
                      </div>
                    </label>
                    <label class="fld fld--full">
                      <span>Name on card</span>
                      <input autocomplete="cc-name" placeholder="Full name" [value]="cardName()" (input)="cardName.set($any($event.target).value)" />
                    </label>
                    <label class="fld"><span>Expiry</span><input inputmode="numeric" autocomplete="cc-exp" placeholder="MM / YY" [value]="cardExp()" (input)="onExp($event)" /></label>
                    <label class="fld"><span>CVC</span><input inputmode="numeric" autocomplete="cc-csc" placeholder="123" [value]="cardCvc()" (input)="onCvc($event)" /></label>
                  </div>
                }
              </div>
            } @else if (method() === 'wallet') {
              <div class="plan">
                <div class="plan__row"><span>Wallet balance</span><b class="tabular">SAR {{ fmt(walletBalance) }}</b></div>
                <div class="plan__row"><span>After this payment</span><b class="tabular" [class.is-short]="walletShort()">SAR {{ fmt(walletAfter()) }}</b></div>
                @if (walletShort()) { <p class="plan__warn"><app-icon name="info" [size]="13" /> Insufficient balance — top up your wallet first.</p> }
              </div>
            } @else {
              <div class="plan">
                <p class="plan__t">{{ method() === 'tabby' ? '4 interest-free payments' : '3 interest-free payments' }}</p>
                <div class="plan__rows">
                  @for (p of installments(); track $index) {
                    <div class="plan__row"><span>{{ p.when }}</span><b class="tabular">SAR {{ fmt(p.amt) }}</b></div>
                  }
                </div>
              </div>
            }
          </div>

          <div class="pid__foot">
            <button class="pid__btn" type="button" [disabled]="!canPay()" (click)="confirm(inv)">
              <app-icon name="shield" [size]="16" /> Pay SAR {{ fmt(b.total) }}
            </button>
            <p class="pid__secure">Secured payment · your details are encrypted</p>
          </div>
        }
      </aside>
    }
  `,
  styles: [`
    .pid.sd { inline-size: min(430px, 100vw); }
    .pid__body { display: flex; flex-direction: column; gap: 18px; padding: var(--sp-4); }

    /* Bill */
    .bill { border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; }
    .bill__ship { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding-block-end: 10px; margin-block-end: 8px; border-block-end: 1px solid var(--line-soft); font-size: 12.5px; color: var(--ink-2); }
    .bill__ship b { font-weight: 700; color: var(--strong); }
    .bill__row { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); padding-block: 5px; font-size: 13px; color: var(--ink-2); }
    .bill__row b { font-weight: 600; color: var(--strong); }
    .bill__total { display: flex; align-items: baseline; justify-content: space-between; gap: var(--sp-3); margin-block-start: 8px; padding-block-start: 12px; border-block-start: 1px solid var(--line); }
    .bill__total span { font-size: 14px; font-weight: 700; color: var(--strong); }
    .bill__total b { font-size: 21px; font-weight: 800; color: var(--navy-900); }

    .pid__label { font-size: 11px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; color: var(--ink-3); }

    /* Method tiles (no radios) */
    .tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .tile { position: relative; block-size: 66px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 5px; border: 1px solid var(--line); border-radius: 13px; background: var(--card); cursor: pointer; transition: background var(--dur-fast) var(--ease); }
    .tile:hover { background: var(--line-soft); }
    .tile.is-on { background: rgba(34, 50, 103, 0.06); }
    .tile__card { color: var(--navy); }
    .tile__lb { font-size: 12px; font-weight: 600; color: var(--strong); }
    .tile__logo { block-size: 20px; inline-size: auto; max-inline-size: 76px; object-fit: contain; }

    /* Wordmarks */
    .wm { font-family: Arial, "Helvetica Neue", sans-serif; font-weight: 800; line-height: 1; }
    .wm--visa { color: #1A1F71; font-style: italic; font-size: 13px; letter-spacing: -0.4px; }
    .wm--tabby { color: #0A8F6F; font-size: 17px; letter-spacing: -0.4px; }
    .wm--tamara { font-size: 16px; letter-spacing: -0.4px; background: linear-gradient(90deg, #FF7A45, #B14EFF); -webkit-background-clip: text; background-clip: text; color: transparent; }

    /* Saved cards + add new */
    .cards { display: flex; flex-direction: column; gap: 9px; }
    .scard { display: flex; align-items: center; gap: 12px; inline-size: 100%; padding: 11px 13px; border: 1px solid var(--line); border-radius: 12px; background: var(--card); font-family: var(--font); text-align: start; cursor: pointer; transition: background var(--dur-fast) var(--ease); }
    .scard:hover { background: var(--line-soft); }
    .scard.is-on { background: rgba(34, 50, 103, 0.06); }
    .scard__logo { inline-size: 46px; block-size: 30px; flex: none; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 7px; background: #fff; color: var(--navy); }
    .scard__logo--add { border-style: dashed; }
    .scard__body { flex: 1; min-inline-size: 0; display: flex; flex-direction: column; gap: 1px; }
    .scard__n { font-size: 13.5px; font-weight: 600; color: var(--strong); }
    .scard__x { font-size: 11.5px; color: var(--ink-3); }
    .scard__ck { inline-size: 19px; block-size: 19px; flex: none; border-radius: 50%; border: 2px solid var(--line); display: grid; place-items: center; }
    .scard__ck.is-on { border-color: var(--navy); background: var(--navy); color: #fff; }

    /* Card form */
    .cardform { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-block-start: 2px; }
    .fld { display: flex; flex-direction: column; gap: 5px; }
    .fld--full { grid-column: 1 / -1; }
    .fld span { font-size: 11.5px; font-weight: 600; color: var(--ink-2); }
    .fld input { block-size: 44px; padding-inline: 13px; border: 1px solid var(--line); border-radius: 11px; background: var(--card); font-family: var(--font); font-size: 14px; color: var(--strong); inline-size: 100%; font-variant-numeric: tabular-nums; }
    .fld input:focus-visible { outline: 2px solid var(--navy); outline-offset: 1px; }
    .fld__wrap { position: relative; display: flex; align-items: center; }
    .fld__accept { position: absolute; inset-inline-end: 12px; display: inline-flex; align-items: center; gap: 6px; pointer-events: none; }

    /* BNPL plan */
    .plan { border: 1px solid var(--line); border-radius: 12px; padding: 14px 16px; }
    .plan__t { margin: 0 0 10px; font-size: 13px; font-weight: 600; color: var(--strong); }
    .plan__rows { display: flex; flex-direction: column; gap: 8px; }
    .plan__row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: var(--ink-2); }
    .plan__row b { font-weight: 600; color: var(--strong); }
    .plan__row b.is-short { color: var(--danger); }
    .plan__warn { display: flex; align-items: center; gap: 7px; margin: 10px 0 0; font-size: 12px; color: var(--danger); }

    /* Footer */
    .pid__foot { padding: var(--sp-4); border-block-start: 1px solid var(--line); display: flex; flex-direction: column; gap: 8px; }
    .pid__btn { inline-size: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 8px; block-size: 50px; border: none; border-radius: 13px; background: var(--navy); color: #fff; font-family: var(--font); font-size: 15px; font-weight: 600; }
    .pid__btn:hover { background: var(--navy-700); }
    .pid__btn:disabled { opacity: 0.5; }
    .pid__secure { margin: 0; text-align: center; font-size: 11.5px; color: var(--ink-3); }

    /* Success */
    .pid__x { position: absolute; inset-block-start: 14px; inset-inline-end: 14px; inline-size: 34px; block-size: 34px; display: grid; place-items: center; border: none; background: none; border-radius: 9px; color: var(--ink-2); }
    .pid__x:hover { background: var(--line-soft); }
    .ok { block-size: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 32px 28px; text-align: center; }
    .ok__badge { inline-size: 78px; block-size: 78px; display: grid; place-items: center; border-radius: 50%; background: var(--ok-bg); color: var(--ok); margin-block-end: 8px; animation: ok-pop 340ms var(--ease); }
    @keyframes ok-pop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .ok__badge { animation: none; } }
    .ok__t { margin: 0; font-size: 20px; font-weight: 800; color: var(--strong); }
    .ok__s { margin: 0; font-size: 13.5px; color: var(--ink-2); }
    .ok__meta { inline-size: 100%; margin-block: 20px 24px; border: 1px solid var(--line); border-radius: 12px; padding: 6px 14px; }
    .ok__row { display: flex; align-items: center; justify-content: space-between; padding-block: 9px; font-size: 13px; color: var(--ink-2); border-block-end: 1px solid var(--line-soft); }
    .ok__row:last-child { border-block-end: none; }
    .ok__row b { font-weight: 600; color: var(--strong); }
    .ok .pid__btn { inline-size: 100%; }
    .tabular { font-variant-numeric: tabular-nums; }
  `],
})
export class PayInvoiceDrawer {
  readonly invoice = input<Invoice | null>(null);
  readonly closed = output<void>();
  readonly paid = output<{ invoice: Invoice; method: string }>();

  protected readonly stage = signal<'pay' | 'success'>('pay');
  protected readonly method = signal<MethodId>('card');
  protected readonly savedCards = SAVED_CARDS;
  protected readonly cardSel = signal<string>(SAVED_CARDS[0]?.id ?? 'new'); // saved card id or 'new'

  protected readonly cardNumber = signal('');
  protected readonly cardName = signal('');
  protected readonly cardExp = signal('');
  protected readonly cardCvc = signal('');

  protected readonly bill = computed(() => {
    const inv = this.invoice();
    if (!inv) return null;
    const total = inv.amount.amount;
    const subtotal = Math.round(total / 1.15);
    const vat = total - subtotal;
    const waiting = hash(inv.id) % 2 === 0 ? Math.round(subtotal * 0.08) : 0;
    return { shipmentId: inv.shipmentId, amount: subtotal - waiting, waiting, vat, total };
  });

  protected readonly installments = computed(() => {
    const t = this.bill()?.total ?? 0;
    if (this.method() === 'tabby') {
      return split(t, 4).map((amt, i) => ({ when: ['Today', 'In 2 weeks', 'In 4 weeks', 'In 6 weeks'][i], amt }));
    }
    if (this.method() === 'tamara') {
      return split(t, 3).map((amt, i) => ({ when: ['Today', 'In 1 month', 'In 2 months'][i], amt }));
    }
    return [];
  });

  protected readonly walletBalance = WALLET_BALANCE;
  protected readonly walletAfter = computed(() => WALLET_BALANCE - (this.bill()?.total ?? 0));
  protected readonly walletShort = computed(() => (this.bill()?.total ?? 0) > WALLET_BALANCE);

  protected readonly canPay = computed(() => {
    if (this.method() === 'wallet') return !this.walletShort();
    if (this.method() !== 'card') return true;
    if (this.cardSel() !== 'new') return true; // an existing saved card is selected
    const num = this.cardNumber().replace(/\s/g, '');
    return num.length >= 12 && this.cardExp().length === 7 && this.cardCvc().length >= 3 && this.cardName().trim().length > 1;
  });

  protected readonly methodLabel = computed(() => {
    if (this.method() === 'wallet') return 'Madar wallet';
    if (this.method() === 'tabby') return 'Tabby';
    if (this.method() === 'tamara') return 'Tamara';
    if (this.cardSel() === 'new') {
      const n = this.cardNumber().replace(/\D/g, '');
      return n ? `Card •••• ${n.slice(-4)}` : 'Card';
    }
    const c = SAVED_CARDS.find((x) => x.id === this.cardSel());
    return c ? `Card •••• ${c.last4}` : 'Card';
  });
  protected readonly payRef = computed(() => {
    const inv = this.invoice();
    return inv ? `PAY-${(hash(inv.id) % 900000 + 100000)}` : '';
  });

  constructor() {
    effect(() => {
      if (this.invoice()) untracked(() => {
        this.stage.set('pay'); this.method.set('card'); this.cardSel.set(SAVED_CARDS[0]?.id ?? 'new');
        this.cardNumber.set(''); this.cardName.set(''); this.cardExp.set(''); this.cardCvc.set('');
      });
    });
  }

  protected onCard(e: Event): void {
    const d = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 16);
    this.cardNumber.set(d.replace(/(.{4})(?=.)/g, '$1 '));
  }
  protected onExp(e: Event): void {
    let d = (e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4);
    if (d.length >= 3) d = `${d.slice(0, 2)} / ${d.slice(2)}`;
    this.cardExp.set(d);
  }
  protected onCvc(e: Event): void {
    this.cardCvc.set((e.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4));
  }

  protected confirm(inv: Invoice): void {
    this.paid.emit({ invoice: inv, method: this.method() });
    this.stage.set('success');
  }
  protected today(): string { return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
  protected fmt(n: number): string { return n.toLocaleString('en-US'); }
}
