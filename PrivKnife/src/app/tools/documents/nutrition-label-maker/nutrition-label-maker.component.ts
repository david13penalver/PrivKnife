import { TranslatePipe } from '../../../core/i18n';
import {
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  LabelExportFormat,
  NutritionLabelMakerOptions,
  NutritionLabelMakerResult,
  RegulatoryStandard,
} from './types';
import {
  generateNutritionLabelSvg,
  processNutritionLabel,
} from './engine';
import { DEFAULT_FDA_OPTIONS } from './test-fixtures';

@Component({
  selector: 'app-nutrition-label-maker',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './nutrition-label-maker.component.html',
  styleUrl: './nutrition-label-maker.component.scss',
})
export class NutritionLabelMakerComponent implements OnDestroy {
  private sanitizer = inject(DomSanitizer);

  // Reactive state signals
  regulatoryStandard = signal<RegulatoryStandard>('fda_standard_2016');
  productName = signal<string>('Organic Granola Crunch');
  servingSizeText = signal<string>('2/3 cup (55g)');
  servingsPerContainer = signal<string>('8');
  calories = signal<number>(230);
  totalFatG = signal<number>(8);
  saturatedFatG = signal<number>(1);
  transFatG = signal<number>(0);
  cholesterolMg = signal<number>(0);
  sodiumMg = signal<number>(160);
  totalCarbsG = signal<number>(37);
  dietaryFiberG = signal<number>(4);
  totalSugarsG = signal<number>(12);
  addedSugarsG = signal<number>(10);
  proteinG = signal<number>(3);
  vitaminDMcg = signal<number>(2);
  calciumMg = signal<number>(260);
  ironMg = signal<number>(8);
  potassiumMg = signal<number>(240);
  exportFormat = signal<LabelExportFormat>('svg');

  isProcessing = signal<boolean>(false);
  result = signal<NutritionLabelMakerResult | null>(null);
  downloadUrl = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  // Computed options & live SVG
  currentOptions = computed<NutritionLabelMakerOptions>(() => ({
    regulatoryStandard: this.regulatoryStandard(),
    productName: this.productName(),
    servingSizeText: this.servingSizeText(),
    servingsPerContainer: this.servingsPerContainer(),
    calories: this.calories(),
    totalFatG: this.totalFatG(),
    saturatedFatG: this.saturatedFatG(),
    transFatG: this.transFatG(),
    cholesterolMg: this.cholesterolMg(),
    sodiumMg: this.sodiumMg(),
    totalCarbsG: this.totalCarbsG(),
    dietaryFiberG: this.dietaryFiberG(),
    totalSugarsG: this.totalSugarsG(),
    addedSugarsG: this.addedSugarsG(),
    proteinG: this.proteinG(),
    vitaminDMcg: this.vitaminDMcg(),
    calciumMg: this.calciumMg(),
    ironMg: this.ironMg(),
    potassiumMg: this.potassiumMg(),
    exportFormat: this.exportFormat(),
  }));

  liveSvg = computed<string>(() => generateNutritionLabelSvg(this.currentOptions()));

  safeLiveSvg = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.liveSvg())
  );

  ngOnDestroy(): void {
    this.revokeDownloadUrl();
  }

  updateStandard(std: RegulatoryStandard): void {
    this.regulatoryStandard.set(std);
  }

  updateProductName(val: string): void {
    this.productName.set(val);
  }

  updateServingSize(val: string): void {
    this.servingSizeText.set(val);
  }

  updateServingsPerContainer(val: string): void {
    this.servingsPerContainer.set(val);
  }

  updateCalories(val: number): void {
    this.calories.set(Number(val) || 0);
  }

  updateTotalFat(val: number): void {
    this.totalFatG.set(Number(val) || 0);
  }

  updateSaturatedFat(val: number): void {
    this.saturatedFatG.set(Number(val) || 0);
  }

  updateTransFat(val: number): void {
    this.transFatG.set(Number(val) || 0);
  }

  updateCholesterol(val: number): void {
    this.cholesterolMg.set(Number(val) || 0);
  }

  updateSodium(val: number): void {
    this.sodiumMg.set(Number(val) || 0);
  }

  updateTotalCarbs(val: number): void {
    this.totalCarbsG.set(Number(val) || 0);
  }

  updateDietaryFiber(val: number): void {
    this.dietaryFiberG.set(Number(val) || 0);
  }

  updateTotalSugars(val: number): void {
    this.totalSugarsG.set(Number(val) || 0);
  }

  updateAddedSugars(val: number): void {
    this.addedSugarsG.set(Number(val) || 0);
  }

  updateProtein(val: number): void {
    this.proteinG.set(Number(val) || 0);
  }

  updateVitaminD(val: number): void {
    this.vitaminDMcg.set(Number(val) || 0);
  }

  updateCalcium(val: number): void {
    this.calciumMg.set(Number(val) || 0);
  }

  updateIron(val: number): void {
    this.ironMg.set(Number(val) || 0);
  }

  updatePotassium(val: number): void {
    this.potassiumMg.set(Number(val) || 0);
  }

  updateExportFormat(fmt: LabelExportFormat): void {
    this.exportFormat.set(fmt);
  }

  async generateDeliverable(): Promise<void> {
    this.isProcessing.set(true);
    this.errorMessage.set(null);

    const res = await processNutritionLabel(this.currentOptions());
    this.isProcessing.set(false);

    if (res.success) {
      this.revokeDownloadUrl();
      this.result.set(res);
      this.downloadUrl.set(URL.createObjectURL(res.blob));
    } else {
      this.errorMessage.set(res.error || 'Failed to generate nutrition label');
    }
  }

  downloadResult(): void {
    const res = this.result();
    const url = this.downloadUrl();
    if (!res || !url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = res.fileName;
    a.click();
  }

  resetToDefaults(): void {
    this.revokeDownloadUrl();
    this.result.set(null);
    this.errorMessage.set(null);

    this.regulatoryStandard.set(DEFAULT_FDA_OPTIONS.regulatoryStandard);
    this.productName.set(DEFAULT_FDA_OPTIONS.productName || '');
    this.servingSizeText.set(DEFAULT_FDA_OPTIONS.servingSizeText);
    this.servingsPerContainer.set(DEFAULT_FDA_OPTIONS.servingsPerContainer);
    this.calories.set(DEFAULT_FDA_OPTIONS.calories);
    this.totalFatG.set(DEFAULT_FDA_OPTIONS.totalFatG);
    this.saturatedFatG.set(DEFAULT_FDA_OPTIONS.saturatedFatG);
    this.transFatG.set(DEFAULT_FDA_OPTIONS.transFatG);
    this.cholesterolMg.set(DEFAULT_FDA_OPTIONS.cholesterolMg);
    this.sodiumMg.set(DEFAULT_FDA_OPTIONS.sodiumMg);
    this.totalCarbsG.set(DEFAULT_FDA_OPTIONS.totalCarbsG);
    this.dietaryFiberG.set(DEFAULT_FDA_OPTIONS.dietaryFiberG);
    this.totalSugarsG.set(DEFAULT_FDA_OPTIONS.totalSugarsG);
    this.addedSugarsG.set(DEFAULT_FDA_OPTIONS.addedSugarsG);
    this.proteinG.set(DEFAULT_FDA_OPTIONS.proteinG);
    this.vitaminDMcg.set(DEFAULT_FDA_OPTIONS.vitaminDMcg);
    this.calciumMg.set(DEFAULT_FDA_OPTIONS.calciumMg);
    this.ironMg.set(DEFAULT_FDA_OPTIONS.ironMg);
    this.potassiumMg.set(DEFAULT_FDA_OPTIONS.potassiumMg);
    this.exportFormat.set('svg');
  }

  private revokeDownloadUrl(): void {
    const url = this.downloadUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.downloadUrl.set(null);
    }
  }
}
