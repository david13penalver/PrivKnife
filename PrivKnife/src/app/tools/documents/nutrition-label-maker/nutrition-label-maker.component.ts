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
  imports: [CommonModule, FormsModule],
  template: `
    <div class="l-page">
      <div class="l-page__header c-header">
        <div class="c-header__title-group">
          <h1 class="c-header__title">FDA & EU Nutrition Facts & Supplement Label Maker</h1>
          <p class="c-header__subtitle">
            Create regulatory-compliant nutrition panels (FDA 2016, EU Regulation 1169/2011, Supplement Facts, Dual Column) with real-time Daily Value % calculations, exporting pixel-perfect vector SVG and PDF files 100% locally in your browser.
          </p>
        </div>
        <div class="c-badge c-badge--privacy">
          🛡️ 100% In-Browser • Never Leaves Your Device
        </div>
      </div>

      <div class="l-columns l-columns--2">
        <!-- Controls Column -->
        <div class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Nutritional Information & Regulations</h2>
          </div>
          <div class="c-card__body">
            <!-- Regulatory Standard -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label" for="regulatoryStandardSelect">Regulatory Format</label>
              <select
                id="regulatoryStandardSelect"
                class="c-input c-input--select"
                [ngModel]="regulatoryStandard()"
                (ngModelChange)="updateStandard($event)"
              >
                <option value="fda_standard_2016">FDA Standard (2016 Revision)</option>
                <option value="eu_standard_1169">EU Regulation 1169/2011 (Per 100g / Portion)</option>
                <option value="fda_supplement_facts">FDA Supplement Facts</option>
                <option value="fda_dual_column">FDA Dual Column (Per Serving & Per Container)</option>
              </select>
            </div>

            <!-- Product & Serving Info -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label" for="productNameInput">Product Name (Optional)</label>
              <input
                id="productNameInput"
                type="text"
                class="c-input"
                placeholder="e.g. Organic Granola Crunch"
                [ngModel]="productName()"
                (ngModelChange)="updateProductName($event)"
              />
            </div>

            <div class="l-columns l-columns--2 g--margin-bottom-4">
              <div class="l-columns__area">
                <label class="c-input__label" for="servingSizeInput">Serving Size</label>
                <input
                  id="servingSizeInput"
                  type="text"
                  class="c-input"
                  placeholder="e.g. 2/3 cup (55g)"
                  [ngModel]="servingSizeText()"
                  (ngModelChange)="updateServingSize($event)"
                />
              </div>
              <div class="l-columns__area">
                <label class="c-input__label" for="servingsContainerInput">Servings Per Container</label>
                <input
                  id="servingsContainerInput"
                  type="text"
                  class="c-input"
                  placeholder="e.g. 8"
                  [ngModel]="servingsPerContainer()"
                  (ngModelChange)="updateServingsPerContainer($event)"
                />
              </div>
            </div>

            <!-- Energy & Calories -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label" for="caloriesInput">Calories / Energy (kcal)</label>
              <input
                id="caloriesInput"
                type="number"
                min="0"
                class="c-input c-input--number"
                [ngModel]="calories()"
                (ngModelChange)="updateCalories($event)"
              />
            </div>

            <!-- Macronutrients -->
            <h3 class="c-card__subtitle g--margin-bottom-2">Macronutrients (Grams & Milligrams)</h3>

            <div class="l-columns l-columns--3 g--margin-bottom-3">
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="totalFatInput">Total Fat (g)</label>
                <input
                  id="totalFatInput"
                  type="number"
                  min="0"
                  step="0.5"
                  class="c-input c-input--number"
                  [ngModel]="totalFatG()"
                  (ngModelChange)="updateTotalFat($event)"
                />
              </div>
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="saturatedFatInput">Sat. Fat (g)</label>
                <input
                  id="saturatedFatInput"
                  type="number"
                  min="0"
                  step="0.5"
                  class="c-input c-input--number"
                  [ngModel]="saturatedFatG()"
                  (ngModelChange)="updateSaturatedFat($event)"
                />
              </div>
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="transFatInput">Trans Fat (g)</label>
                <input
                  id="transFatInput"
                  type="number"
                  min="0"
                  step="0.5"
                  class="c-input c-input--number"
                  [ngModel]="transFatG()"
                  (ngModelChange)="updateTransFat($event)"
                />
              </div>
            </div>

            <div class="l-columns l-columns--2 g--margin-bottom-3">
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="cholesterolInput">Cholesterol (mg)</label>
                <input
                  id="cholesterolInput"
                  type="number"
                  min="0"
                  class="c-input c-input--number"
                  [ngModel]="cholesterolMg()"
                  (ngModelChange)="updateCholesterol($event)"
                />
              </div>
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="sodiumInput">Sodium (mg)</label>
                <input
                  id="sodiumInput"
                  type="number"
                  min="0"
                  class="c-input c-input--number"
                  [ngModel]="sodiumMg()"
                  (ngModelChange)="updateSodium($event)"
                />
              </div>
            </div>

            <div class="l-columns l-columns--3 g--margin-bottom-3">
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="totalCarbsInput">Total Carbs (g)</label>
                <input
                  id="totalCarbsInput"
                  type="number"
                  min="0"
                  step="0.5"
                  class="c-input c-input--number"
                  [ngModel]="totalCarbsG()"
                  (ngModelChange)="updateTotalCarbs($event)"
                />
              </div>
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="fiberInput">Dietary Fiber (g)</label>
                <input
                  id="fiberInput"
                  type="number"
                  min="0"
                  step="0.5"
                  class="c-input c-input--number"
                  [ngModel]="dietaryFiberG()"
                  (ngModelChange)="updateDietaryFiber($event)"
                />
              </div>
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="sugarsInput">Total Sugars (g)</label>
                <input
                  id="sugarsInput"
                  type="number"
                  min="0"
                  step="0.5"
                  class="c-input c-input--number"
                  [ngModel]="totalSugarsG()"
                  (ngModelChange)="updateTotalSugars($event)"
                />
              </div>
            </div>

            <div class="l-columns l-columns--2 g--margin-bottom-4">
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="addedSugarsInput">Added Sugars (g)</label>
                <input
                  id="addedSugarsInput"
                  type="number"
                  min="0"
                  step="0.5"
                  class="c-input c-input--number"
                  [ngModel]="addedSugarsG()"
                  (ngModelChange)="updateAddedSugars($event)"
                />
              </div>
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="proteinInput">Protein (g)</label>
                <input
                  id="proteinInput"
                  type="number"
                  min="0"
                  step="0.5"
                  class="c-input c-input--number"
                  [ngModel]="proteinG()"
                  (ngModelChange)="updateProtein($event)"
                />
              </div>
            </div>

            <!-- Micronutrients -->
            <h3 class="c-card__subtitle g--margin-bottom-2">Vitamins & Minerals</h3>
            <div class="l-columns l-columns--4 g--margin-bottom-4">
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="vitDInput">Vit D (mcg)</label>
                <input
                  id="vitDInput"
                  type="number"
                  min="0"
                  step="0.5"
                  class="c-input c-input--number"
                  [ngModel]="vitaminDMcg()"
                  (ngModelChange)="updateVitaminD($event)"
                />
              </div>
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="calciumInput">Calcium (mg)</label>
                <input
                  id="calciumInput"
                  type="number"
                  min="0"
                  class="c-input c-input--number"
                  [ngModel]="calciumMg()"
                  (ngModelChange)="updateCalcium($event)"
                />
              </div>
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="ironInput">Iron (mg)</label>
                <input
                  id="ironInput"
                  type="number"
                  min="0"
                  step="0.5"
                  class="c-input c-input--number"
                  [ngModel]="ironMg()"
                  (ngModelChange)="updateIron($event)"
                />
              </div>
              <div class="l-columns__area">
                <label class="c-input__sublabel" for="potassiumInput">Potass. (mg)</label>
                <input
                  id="potassiumInput"
                  type="number"
                  min="0"
                  class="c-input c-input--number"
                  [ngModel]="potassiumMg()"
                  (ngModelChange)="updatePotassium($event)"
                />
              </div>
            </div>

            <!-- Export Format -->
            <div class="g--margin-bottom-4">
              <label class="c-input__label" for="exportFormatSelect">Export File Format</label>
              <select
                id="exportFormatSelect"
                class="c-input c-input--select"
                [ngModel]="exportFormat()"
                (ngModelChange)="updateExportFormat($event)"
              >
                <option value="svg">SVG (Scalable Vector Graphic - Recommended for print/packaging)</option>
                <option value="pdf">PDF (Vector Document via jsPDF)</option>
              </select>
            </div>
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-izquierda">
              <button
                type="button"
                class="c-button c-button--outline"
                (click)="resetToDefaults()"
                [disabled]="isProcessing()"
              >
                Reset to Defaults
              </button>
            </div>
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                (click)="generateDeliverable()"
                [disabled]="isProcessing()"
              >
                {{ isProcessing() ? 'Generating...' : 'Export Deliverable' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Preview Column -->
        <div class="l-columns__area c-card">
          <div class="c-card__header">
            <h2 class="c-card__title">Real-Time Label Preview</h2>
          </div>
          <div class="c-card__body">
            <div class="c-preview g--flex-center" style="background-color: #f1f5f9; padding: 24px; border-radius: 8px; justify-content: center; overflow: auto; min-height: 480px;">
              <div class="c-preview__svg-container" [innerHTML]="safeLiveSvg()"></div>
            </div>

            @if (errorMessage()) {
              <div class="c-alert c-alert--danger g--margin-top-4">
                {{ errorMessage() }}
              </div>
            }
          </div>

          <div class="c-card__footer l-extremo">
            <div class="l-extremo__area-derecha">
              <button
                type="button"
                class="c-button c-button--primary"
                [disabled]="!downloadUrl()"
                (click)="downloadResult()"
              >
                Download {{ result()?.fileName || 'Nutrition Label' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .c-card__subtitle {
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--color-text, #1e293b);
      }
      .c-input__sublabel {
        font-size: 0.75rem;
        color: var(--color-text-muted, #64748b);
        display: block;
        margin-bottom: 2px;
      }
      .c-preview__svg-container {
        display: flex;
        justify-content: center;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        border-radius: 4px;
        background: #fff;
      }
    `,
  ],
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
