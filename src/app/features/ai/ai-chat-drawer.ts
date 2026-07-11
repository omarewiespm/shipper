import { A11yModule } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, effect, ElementRef, inject, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { Icon } from '../../shared/ui';
import { AiChatService } from './ai-chat.service';

interface Action { label: string; route: string }
interface Msg { id: number; from: 'ai' | 'user'; text: string; action?: Action }

/** Madar AI chat as a right-side drawer (mock assistant with quick hand-offs). */
@Component({
  selector: 'app-ai-chat-drawer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, Icon],
  templateUrl: './ai-chat-drawer.html',
  styleUrl: './ai-chat-drawer.scss',
})
export class AiChatDrawer {
  protected readonly svc = inject(AiChatService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly messages = signal<Msg[]>([]);
  protected readonly draft = signal('');
  protected readonly thinking = signal(false);
  private seq = 0;
  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');

  constructor() {
    effect(() => {
      const s = this.svc.session();
      if (s === 0) return;
      untracked(() => this.startSession());
    });
  }

  private startSession(): void {
    this.messages.set([]);
    this.draft.set('');
    const p = this.svc.seedPrompt();
    if (p) this.handle(p);
    else this.push('ai', "Hi — I'm Madar AI. How can I help with your shipments, invoices or deliveries?");
  }

  protected send(): void {
    const text = this.draft().trim();
    if (!text || this.thinking()) return;
    this.draft.set('');
    this.handle(text);
  }
  protected voice(): void {
    this.toast.show('Voice input coming soon');
  }
  protected go(a: Action): void {
    this.svc.close();
    this.router.navigateByUrl(a.route);
  }

  private handle(text: string): void {
    this.push('user', text);
    this.thinking.set(true);
    setTimeout(() => {
      this.thinking.set(false);
      const r = this.respond(text);
      this.push('ai', r.text, r.action);
    }, 600);
  }

  private respond(text: string): { text: string; action?: Action } {
    const l = text.toLowerCase();
    if (/(create|new shipment|send a|ship )/.test(l)) return { text: "Happy to help you create a shipment — I can pull your pickup and price it instantly.", action: { label: 'Start a shipment', route: '/shipments/create' } };
    if (/track|where.*shipment|location/.test(l)) return { text: 'I can show where your shipments are right now on the map.', action: { label: 'Open live tracking', route: '/tracking' } };
    if (/invoice|owe|pay|bill/.test(l)) return { text: 'You have invoices due. Want to review and pay them?', action: { label: 'Open payments', route: '/payments' } };
    if (/receiver|customer/.test(l)) return { text: "Let's add a receiver — your customer's delivery location.", action: { label: 'Add a receiver', route: '/receivers' } };
    if (/report|spend|volume|on-time/.test(l)) return { text: 'I can open your reports — spend, volume, on-time and carrier performance.', action: { label: 'Open reports', route: '/reports' } };
    if (/team|colleague|invite|user/.test(l)) return { text: 'You can invite colleagues and set their roles.', action: { label: 'Manage team', route: '/settings/users' } };
    return { text: 'I can help with creating shipments, tracking, invoices, receivers, reports and your team. What would you like to do?' };
  }

  private push(from: 'ai' | 'user', text: string, action?: Action): void {
    this.messages.update((m) => [...m, { id: ++this.seq, from, text, action }]);
    queueMicrotask(() => {
      const el = this.scroller()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
