import { Code, Cpu, Database, Info, Loader2, Settings } from 'lucide-react';

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ModelInfo, ollamaApi } from '@/services/ollamaApi';

interface LocalModelInfoDialogProps {
  modelName: string | null;
  open: boolean;
  onClose: () => void;
}

const LocalModelInfoDialog: React.FC<LocalModelInfoDialogProps> = ({
  modelName,
  open,
  onClose,
}) => {
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
        // Failed to get model info
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
      <div className='space-y-2'>
        {params.map((param, index) => {
          const [key, ...value] = param.split(/\s+/);
          return (
            <div
              key={index}
              className='flex justify-between items-center p-2 bg-white/5 backdrop-blur-sm rounded border border-white/10'
            >
              <span className='text-white/70 font-medium'>{key}</span>
              <span className='font-mono text-sky-300 text-sm'>{value.join(' ')}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderModelInfo = () => {
    if (!modelInfo?.model_info) return null;

    const importantFields = [
      'general.architecture',
      'general.parameter_count',
      'general.file_type',
      'llama.context_length',
      'llama.embedding_length',
      'llama.attention.head_count',
      'llama.block_count',
      'llama.vocab_size',
    ];

    const otherFields = Object.keys(modelInfo.model_info).filter(
      key =>
        !importantFields.includes(key) &&
        !key.includes('token') &&
        modelInfo.model_info[key] !== null &&
        modelInfo.model_info[key] !== undefined
    );

    return (
      <div className='space-y-4'>
        {/* Important model information */}
        <Card className='bg-white/5 backdrop-blur-sm border-white/10'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-white/90 text-sm flex items-center gap-2'>
              <Cpu className='w-4 h-4' />
              {t('localModels.dialog.architecture.coreArchitectureInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            {importantFields.map(field => {
              const value = modelInfo.model_info[field];
              if (value === null || value === undefined) return null;

              return (
                <div key={field} className='flex justify-between items-center'>
                  <span className='text-white/70 text-sm'>
                    {field.replace('general.', '').replace('llama.', '')}
                  </span>
                  <span className='font-mono text-sky-300 text-sm'>
                    {typeof value === 'number' ? value.toLocaleString() : String(value)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Other model information */}
        {otherFields.length > 0 && (
          <Card className='bg-white/5 backdrop-blur-sm border-white/10'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-white/90 text-sm flex items-center gap-2'>
                <Database className='w-4 h-4' />
                {t('localModels.dialog.architecture.detailedConfigInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className='h-48'>
                <div className='space-y-2 pr-3'>
                  {otherFields.slice(0, 20).map(field => {
                    const value = modelInfo.model_info[field];
                    return (
                      <div key={field} className='flex justify-between items-center text-xs'>
                        <span className='text-white/60'>{field}</span>
                        <span className='font-mono text-white/80'>
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderCapabilities = () => {
    if (!modelInfo?.capabilities || modelInfo.capabilities.length === 0) return null;

    const getCapabilityColor = (capability: string) => {
      switch (capability.toLowerCase()) {
        case 'completion':
          return 'bg-green-500/20 text-green-300 border-green-500/30';
        case 'vision':
          return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        case 'embedding':
          return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        case 'tools':
          return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
        default:
          return 'bg-white/10 text-white/70 border-white/20';
      }
    };

    return (
      <div className='space-y-3'>
        <h4 className='font-semibold text-white/90 flex items-center gap-2'>
          <Settings className='w-4 h-4' />
          {t('localModels.dialog.overview.modelCapabilities')}
        </h4>
        <div className='flex flex-wrap gap-2'>
          {modelInfo.capabilities.map((capability, index) => (
            <Badge
              key={index}
              variant='outline'
              className={`${getCapabilityColor(capability)} capitalize`}
            >
              {capability}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className='flex justify-center items-center h-[450px]'>
          <Loader2 className='w-8 h-8 animate-spin text-white/70' />
        </div>
      );
    }

    if (!modelInfo) return null;

    return (
      <Tabs defaultValue='overview' className='w-full h-full'>
        <TabsList className='grid w-full grid-cols-4 bg-white/5 backdrop-blur-sm border-white/10'>
          <TabsTrigger
            value='overview'
            className='data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70'
          >
            <Info className='w-4 h-4 mr-2' />
            {t('localModels.dialog.tabs.overview')}
          </TabsTrigger>
          <TabsTrigger
            value='architecture'
            className='data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70'
          >
            <Cpu className='w-4 h-4 mr-2' />
            {t('localModels.dialog.tabs.architecture')}
          </TabsTrigger>
          <TabsTrigger
            value='parameters'
            className='data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70'
          >
            <Settings className='w-4 h-4 mr-2' />
            {t('localModels.dialog.tabs.parameters')}
          </TabsTrigger>
          <TabsTrigger
            value='modelfile'
            className='data-[state=active]:bg-white/20 data-[state=active]:text-white text-white/70'
          >
            <Code className='w-4 h-4 mr-2' />
            {t('localModels.dialog.tabs.configuration')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='mt-4 h-[400px]'>
          <ScrollArea className='h-full'>
            <div className='pr-3'>
              <div className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <Card className='bg-white/5 backdrop-blur-sm border-white/10'>
                    <CardHeader className='pb-3'>
                      <CardTitle className='text-white/90 text-sm'>
                        {t('localModels.dialog.overview.basicInfo')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-white/70'>
                          {t('localModels.dialog.overview.format')}
                        </span>
                        <span className='text-white/90'>{modelInfo.details.format}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-white/70'>
                          {t('localModels.dialog.overview.family')}
                        </span>
                        <span className='text-white/90'>{modelInfo.details.family}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-white/70'>
                          {t('localModels.dialog.overview.parameterSize')}
                        </span>
                        <span className='text-white/90'>{modelInfo.details.parameter_size}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-white/70'>
                          {t('localModels.dialog.overview.quantizationLevel')}
                        </span>
                        <span className='text-white/90'>
                          {modelInfo.details.quantization_level}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className='bg-white/5 backdrop-blur-sm border-white/10'>
                    <CardHeader className='pb-3'>
                      <CardTitle className='text-white/90 text-sm'>
                        {t('localModels.dialog.overview.supportedFamilies')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='flex flex-wrap gap-1'>
                        {modelInfo.details.families.map((family, index) => (
                          <Badge
                            key={index}
                            variant='outline'
                            className='bg-white/10 text-white/70 border-white/20 text-xs'
                          >
                            {family}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {renderCapabilities()}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value='architecture' className='mt-4 h-[400px]'>
          <ScrollArea className='h-full'>
            <div className='pr-3'>{renderModelInfo()}</div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value='parameters' className='mt-4 h-[400px]'>
          <ScrollArea className='h-full'>
            <div className='pr-3'>
              <div className='space-y-3'>
                <h4 className='font-semibold text-white/90 flex items-center gap-2'>
                  <Settings className='w-4 h-4' />
                  {t('localModels.dialog.parameters.runtimeParameters')}
                </h4>
                {renderParameters()}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value='modelfile' className='mt-4 h-[400px]'>
          <div className='space-y-3 h-full'>
            <h4 className='font-semibold text-white/90 flex items-center gap-2'>
              <Code className='w-4 h-4' />
              {t('localModels.dialog.configuration.modelfileConfig')}
            </h4>
            <ScrollArea
              className='bg-white/5 backdrop-blur-sm rounded-lg p-4 text-white/90 font-mono text-xs border border-white/10'
              style={{ height: modelInfo.template ? 'calc(50% - 2rem)' : 'calc(100% - 3rem)' }}
            >
              <pre className='whitespace-pre-wrap pr-3'>{modelInfo.modelfile}</pre>
            </ScrollArea>

            {modelInfo.template && (
              <>
                <Separator className='bg-white/10' />
                <h4 className='font-semibold text-white/90 text-sm'>
                  {t('localModels.dialog.configuration.templateConfig')}
                </h4>
                <ScrollArea
                  className='bg-white/5 backdrop-blur-sm rounded-lg p-4 text-white/90 font-mono text-xs border border-white/10'
                  style={{ height: 'calc(50% - 2rem)' }}
                >
                  <pre className='whitespace-pre-wrap pr-3'>{modelInfo.template}</pre>
                </ScrollArea>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className='max-w-4xl max-h-[90vh] bg-black/20 backdrop-blur-xl border-white/10 text-white shadow-2xl'>
        <DialogHeader>
          <DialogTitle className='break-all text-lg font-semibold'>{modelName}</DialogTitle>
          <DialogDescription className='text-white/70'>
            {t('localModels.dialog.description', 'View detailed information about this model')}
          </DialogDescription>
          {modelInfo && (
            <div className='flex flex-wrap gap-2 pt-2'>
              <Badge variant='outline' className='bg-blue-500/20 text-blue-300 border-blue-500/30'>
                {modelInfo.details.parameter_size}
              </Badge>
              <Badge
                variant='outline'
                className='bg-green-500/20 text-green-300 border-green-500/30'
              >
                {modelInfo.details.quantization_level}
              </Badge>
              <Badge
                variant='outline'
                className='bg-purple-500/20 text-purple-300 border-purple-500/30'
              >
                {modelInfo.details.family}
              </Badge>
              <Badge
                variant='outline'
                className='bg-orange-500/20 text-orange-300 border-orange-500/30'
              >
                {modelInfo.details.format}
              </Badge>
            </div>
          )}
        </DialogHeader>
        <div className='overflow-hidden h-[500px]'>{renderContent()}</div>
      </DialogContent>
    </Dialog>
  );
};

export default LocalModelInfoDialog;
