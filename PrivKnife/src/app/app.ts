import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { SeoService } from './core/seo/seo.service';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Header, Footer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly seoService = inject(SeoService);
  readonly title = signal('PrivKnife');

  ngOnInit(): void {
    this.seoService.initRouteListener();
  }
}

