import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ollamaApi, ModelInfo } from '@/services/ollamaApi';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface LocalModelInfoDialogProps {
  modelName: string | null;
  open: boolean;
  onClose: () => void;
}

const LocalModelInfoDialog: React.FC<LocalModelInfoDialogProps> = ({ modelName, open, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchModelInfo = async () => {
      if (!modelName) return;
      setIsLoading(true);
      try {
        const info = await ollamaApi.showModelInfo(modelName, true);
        setModelInfo(info);
      } catch (error) {
        console.error('Failed to get model info:', error);
        toast({
          title: t('localModels.getInfoFailed'),
          description: t('localModels.getInfoFailedMessage', { modelName }),
          variant: 'destructive',
          className: 'bg-red-900/80 backdrop-blur-sm border-red-500/20 text-white',
        });
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    if (open) {
      fetchModelInfo();
    }
  }, [modelName, open, t, toast, onClose]);
  
  const renderParameters = () => {
    if (!modelInfo?.parameters) return null;
    
    const params = modelInfo.parameters.split('\n').filter(p => p.trim() !== '');
    
    return (
        <div className="mt-4">
            <h4 className="font-semibold text-white/90 mb-2">{t('localModels.parameters')}</h4>
            <div className="p-3 bg-black/20 rounded-lg text-xs space-y-1">
                {params.map((param, index) => {
                    const [key, ...value] = param.split(/\s+/);
                    return (
                        <div key={index} className="flex justify-between">
                            <span className="text-white/70">{key}</span>
                            <span className="font-mono text-sky-300">{value.join(' ')}</span>
                        </div>
                    )
                })}
            </div>
        </div>
    )
  }

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-white/70"/></div>;
    }
    
    if (!modelInfo) return null;
    
    return (
        <>
            <p className="text-sm text-white/70 mt-2">{t('localModels.modelfileContent')}</p>
            <ScrollArea className="mt-2 bg-black/20 rounded-lg p-4 h-64 text-white/90 font-mono text-xs border border-white/10">
              <pre>{modelInfo.modelfile}</pre>
            </ScrollArea>
            {renderParameters()}
        </>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl bg-black/80 backdrop-blur-sm border-white/20 text-white">
        <DialogHeader>
          <DialogTitle className="break-all">{modelName}</DialogTitle>
          <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary">{modelInfo?.details.parameter_size}</Badge>
              <Badge variant="secondary">{modelInfo?.details.quantization_level}</Badge>
              <Badge variant="secondary">{modelInfo?.details.family}</Badge>
          </div>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default LocalModelInfoDialog; 