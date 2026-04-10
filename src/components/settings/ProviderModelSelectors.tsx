import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ModelTestButton } from './ModelTestButton';

export interface ModelOption {
  value: string;
  label: string;
  description: string;
}

interface ModelSelectorProps {
  label: string;
  value: string;
  models: ModelOption[];
  onValueChange: (model: string) => void;
  placeholder?: string;
}

function ModelSelector({ label, value, models, onValueChange, placeholder }: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder ?? 'Select a model'} />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.value} value={model.value} className="py-2.5">
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-medium">{model.label}</span>
                  <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

interface TestButtonState {
  testingModel: string | null;
  hoveringModel: string | null;
  modelTestStatus: Record<string, 'success' | 'error' | null>;
  isConnected: boolean;
  onTest: (modelValue: string, modelType: 'text' | 'image' | 'video') => void;
  onCancel: (modelValue: string) => void;
  onHoverStart: (modelValue: string) => void;
  onHoverEnd: () => void;
}

interface ProviderModelSelectorsProps {
  textModel: string;
  imageModel: string;
  textModels: ModelOption[];
  imageModels: ModelOption[];
  onTextModelChange: (model: string) => void;
  onImageModelChange: (model: string) => void;
  showDeepResearch?: boolean;
  deepResearchModel?: string;
  deepResearchModels?: ModelOption[];
  onDeepResearchModelChange?: (model: string) => void;
  videoModel?: string;
  videoModels?: ModelOption[];
  onVideoModelChange?: (model: string) => void;
  testButton: TestButtonState;
}

export function ProviderModelSelectors({
  textModel,
  imageModel,
  textModels,
  imageModels,
  onTextModelChange,
  onImageModelChange,
  showDeepResearch = false,
  deepResearchModel,
  deepResearchModels,
  onDeepResearchModelChange,
  videoModel,
  videoModels,
  onVideoModelChange,
  testButton,
}: ProviderModelSelectorsProps) {
  const renderTestBtn = (modelValue: string, modelType: 'text' | 'image' | 'video') => (
    <ModelTestButton
      modelValue={modelValue}
      modelType={modelType}
      isConnected={testButton.isConnected}
      isRunning={testButton.testingModel === modelValue}
      isHovering={testButton.hoveringModel === modelValue}
      status={testButton.modelTestStatus[modelValue]}
      onTest={testButton.onTest}
      onCancel={testButton.onCancel}
      onHoverStart={testButton.onHoverStart}
      onHoverEnd={testButton.onHoverEnd}
    />
  );

  return (
    <>
      {/* General Reasoning */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">General Reasoning</Label>
        <div className="flex gap-2">
          <Select value={textModel} onValueChange={onTextModelChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {textModels.map((model) => (
                <SelectItem key={model.value} value={model.value} className="py-2.5">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-medium">{model.label}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {renderTestBtn(textModel, 'text')}
        </div>
      </div>

      {/* Deep Research */}
      {showDeepResearch && deepResearchModels && onDeepResearchModelChange && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Deep Research</Label>
          <div className="flex gap-2">
            <Select value={deepResearchModel} onValueChange={onDeepResearchModelChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a deep research model" />
              </SelectTrigger>
              <SelectContent>
                {deepResearchModels.map((model) => (
                  <SelectItem key={model.value} value={model.value} className="py-2.5">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">{model.label}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {deepResearchModel && renderTestBtn(deepResearchModel, 'text')}
          </div>
        </div>
      )}

      {/* Image Generation */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Image Generation</Label>
        <div className="flex gap-2">
          <Select value={imageModel} onValueChange={onImageModelChange}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select an image model" />
            </SelectTrigger>
            <SelectContent>
              {imageModels.map((model) => (
                <SelectItem key={model.value} value={model.value} className="py-2.5">
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-medium">{model.label}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {renderTestBtn(imageModel, 'image')}
        </div>
      </div>

      {/* Video Generation */}
      {videoModels && onVideoModelChange && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Video Generation</Label>
          <div className="flex gap-2">
            <Select value={videoModel} onValueChange={onVideoModelChange}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select a video model" />
              </SelectTrigger>
              <SelectContent>
                {videoModels.map((model) => (
                  <SelectItem key={model.value} value={model.value} className="py-2.5">
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-medium">{model.label}</span>
                      <span className="text-xs text-muted-foreground leading-tight">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {videoModel && renderTestBtn(videoModel, 'video')}
          </div>
        </div>
      )}
    </>
  );
}
