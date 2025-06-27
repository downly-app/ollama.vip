import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Download, Trash2, Play, RefreshCw, Search, Info, HardDrive, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { ollamaApi } from '@/services/ollamaApi';
import DownloadProgress from '@/components/DownloadProgress';
import { useDownloadManager } from '@/hooks/useDownloadManager';

interface LocalModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

interface ModelInfo {
  modelfile: string;
  parameters: string;
  template: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  model_info: Record<string, string | number | boolean | null>;
  capabilities: string[];
}

const LocalModelManager = () => {
  const { t } = useTranslation();
  const { currentTheme } = useTheme();
  const { toast } = useToast();
  const { downloads, startDownload, cancelDownload, dismissDownload } = useDownloadManager();

  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pullModelName, setPullModelName] = useState('');
  const [selectedModel, setSelectedModel] = useState<LocalModel | null>(null);
  const [modelInfo, setModelInfo] = useState<ModelInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  const fetchLocalModels = async () => {
    setIsLoading(true);
    try {
      const models = await ollamaApi.listModels();
      setLocalModels(models);
    } catch (error) {
      console.error('Failed to fetch local models:', error);
      toast({
        title: t('localModels.fetchFailed'),
        description: t('localModels.fetchFailedMessage'),
        variant: 'destructive',
        className: 'bg-red-900/80 backdrop-blur-sm border-red-500/20 text-white',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteModel = async (modelName: string) => {
    try {
      const success = await ollamaApi.deleteModel(modelName);
      if (success) {
        toast({
          title: t('localModels.deleteSuccess'),
          description: t('localModels.deleteSuccessMessage', { modelName }),
          className: 'bg-black/80 backdrop-blur-sm border-white/20 text-white',
        });
        fetchLocalModels();
      }
    } catch (error) {
      console.error('Failed to delete model:', error);
      toast({
        title: t('localModels.deleteFailed'),
        description: t('localModels.deleteFailedMessage', { modelName }),
        variant: 'destructive',
        className: 'bg-red-900/80 backdrop-blur-sm border-red-500/20 text-white',
      });
    }
  };

  // Get model detailed information
  const handleShowModelInfo = async (model: LocalModel) => {
    setSelectedModel(model);
    setIsLoadingInfo(true);
    try {
      const info = await ollamaApi.showModelInfo(model.name, true);
      setModelInfo(info);
    } catch (error) {
      console.error('Failed to get model info:', error);
      toast({
        title: t('localModels.getInfoFailed'),
        description: t('localModels.getInfoFailedMessage', { modelName: model.name }),
        variant: 'destructive',
        className: 'bg-red-900/80 backdrop-blur-sm border-red-500/20 text-white',
      });
    } finally {
      setIsLoadingInfo(false);
    }
  };

  const handlePullModel = async () => {
    if (!pullModelName.trim()) {
      toast({
        title: t('localModels.enterModelName'),
        description: t('localModels.enterModelNameMessage'),
        variant: 'destructive',
        className: 'bg-red-900/80 backdrop-blur-sm border-red-500/20 text-white',
      });
      return;
    }

    startDownload(pullModelName);
    setPullModelName('');
    // Refresh local model list after download completion
    setTimeout(() => {
      fetchLocalModels();
    }, 1000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN');
  };

  const filteredModels = localModels.filter(model =>
    model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    model.details.family.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchLocalModels();
  }, []);

  return (
    <div className="flex-1 flex flex-col h-full space-y-6">
      {/* Header operation area */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-white">{t('localModels.title')}</h2>
          <Badge variant="secondary" className="bg-white/20 text-white">
            {t('localModels.modelsCount', { count: localModels.length })}
          </Badge>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
            <Input
              type="text"
              placeholder={t('localModels.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40"
            />
          </div>

          <Button
            onClick={fetchLocalModels}
            disabled={isLoading}
            className={`bg-gradient-to-r ${currentTheme.colors.primary} text-white border-0 hover:opacity-90 disabled:opacity-50 text-xs`}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Download new model area */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Download className="w-5 h-5" />
            {t('localModels.downloadNewModel')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="text"
              placeholder={t('localModels.modelNamePlaceholder')}
              value={pullModelName}
              onChange={(e) => setPullModelName(e.target.value)}
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
            <Button
              onClick={handlePullModel}
              disabled={!pullModelName.trim()}
              className={`bg-gradient-to-r ${currentTheme.colors.primary} text-white`}
            >
              <Download className="w-4 h-4 mr-2" />
              {t('models.download')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Local models list */}
      <Card className="bg-white/10 backdrop-blur-sm border-white/20 flex-1">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            {t('localModels.localModelsList')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-white/50 animate-spin mr-2" />
              <span className="text-white/70">{t('localModels.loading')}</span>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-white/50">
              <HardDrive className="w-12 h-12 mb-4" />
              <p className="text-lg mb-2">
                {searchQuery ? t('localModels.noModelsFound') : t('localModels.noLocalModels')}
              </p>
              <p className="text-sm">
                {searchQuery ? t('localModels.adjustSearchCriteria') : t('localModels.useDownloadFunction')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map((model) => (
                <div key={model.name} className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/model/${model.name.split(':')[0]}`}
                        className="text-white font-medium hover:text-white/80 transition-colors block truncate"
                      >
                        {model.name}
                      </Link>
                      <p className="text-white/60 text-sm">{model.details.family}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-white/60 mb-4">
                      <div className="flex justify-between">
                        <span>{t('localModels.size')}:</span>
                        <span>{formatSize(model.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('localModels.parameters')}:</span>
                        <span>{model.details.parameter_size}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('localModels.modifiedTime')}:</span>
                        <span>{formatDate(model.modified_at)}</span>
                      </div>
                    </div>

                  <div className="flex gap-2">
                    {/* Model details button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          onClick={() => handleShowModelInfo(model)}
                          className={`bg-gradient-to-r ${currentTheme.colors.primary} text-white border-0 hover:opacity-90 text-xs flex-1`}
                        >
                          <Info size={12} className="mr-1" />
                          {t('localModels.details')}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900/95 backdrop-blur-sm border-white/20 text-white max-w-4xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Info className="w-5 h-5" />
                            {t('localModels.modelInfo')} - {selectedModel?.name}
                          </DialogTitle>
                          <DialogDescription className="text-white/70">
                            {t('localModels.viewDetailedInfo')}
                          </DialogDescription>
                        </DialogHeader>

                        {isLoadingInfo ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                            <span>{t('localModels.loading')}</span>
                          </div>
                        ) : modelInfo ? (
                          <ScrollArea className="max-h-[60vh]">
                            <div className="space-y-6">
                              {/* Basic information */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <h4 className="font-medium mb-3 text-white">{t('localModels.basicInfo')}</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-white/50">{t('localModels.family')}:</span>
                                        <span className="text-white">{selectedModel?.details.family}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-white/50">{t('localModels.format')}:</span>
                                        <span className="text-white">{selectedModel?.details.format}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-white/50">{t('localModels.parameters')}:</span>
                                        <span className="text-white">{selectedModel?.details.parameter_size}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-white/50">{t('localModels.quantization')}:</span>
                                        <span className="text-white">{selectedModel?.details.quantization_level}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-white/50">{t('localModels.size')}:</span>
                                        <span className="text-white">{formatSize(selectedModel?.size || 0)}</span>
                                      </div>
                                  </div>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-3 text-white">{t('localModels.capabilities')}</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {modelInfo.capabilities?.map((cap, index) => (
                                      <Badge key={index} variant="outline" className="text-xs border-white/20 text-white/70 bg-white/5">
                                        {cap}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Model architecture information */}
                              {modelInfo.model_info && (
                                <div>
                                  <h4 className="font-medium mb-3 text-white">
                                  {t('localModels.architectureInfo')} - {modelInfo.model_info['general.architecture'] || 'Unknown'}
                                </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    {Object.entries(modelInfo.model_info)
                                      .filter(([key]) => !key.includes('tokens') && !key.includes('merges') && !key.includes('token_type'))
                                      .slice(0, 12)
                                      .map(([key, value]) => (
                                        <div key={key} className="flex justify-between">
                                          <span className="text-white/50 truncate mr-2">{key.replace('general.', '').replace('llama.', '').replace('_', ' ')}:</span>
                                          <span className="text-white text-right">{typeof value === 'number' ? value.toLocaleString() : String(value)}</span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* Parameter configuration */}
                              {modelInfo.parameters && (
                                <div>
                                  <h4 className="font-medium mb-3 text-white">{t('localModels.parameterConfig')}</h4>
                                  <pre className="text-xs bg-white/5 p-3 rounded overflow-x-auto text-white/80 whitespace-pre-wrap">
                                    {modelInfo.parameters}
                                  </pre>
                                </div>
                              )}

                              {/* Template */}
                              {modelInfo.template && (
                                <div>
                                  <h4 className="font-medium mb-3 text-white">{t('localModels.promptTemplate')}</h4>
                                  <pre className="text-xs bg-white/5 p-3 rounded overflow-x-auto text-white/80 whitespace-pre-wrap">
                                    {modelInfo.template}
                                  </pre>
                                </div>
                              )}

                              {/* Modelfile */}
                              {modelInfo.modelfile && (
                                <div>
                                  <h4 className="font-medium mb-3 text-white">{t('localModels.modelfile')}</h4>
                                  <pre className="text-xs bg-white/5 p-3 rounded overflow-x-auto text-white/80 whitespace-pre-wrap">
                                    {modelInfo.modelfile}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        ) : (
                            <div className="text-center py-8 text-white/50">
                              {t('localModels.failedToGetModelInfo')}
                            </div>
                          )}
                      </DialogContent>
                    </Dialog>

                    {/* Delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/30 text-red-400 hover:bg-red-500/20 hover:border-red-500/50 bg-red-500/10 text-xs hover:text-red-300"
                        >
                          <Trash2 size={12} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-gray-900/95 backdrop-blur-sm border-white/20 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            {t('localModels.confirmDeleteModel')}
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-white/70">
                            {t('localModels.deleteConfirmation', { modelName: model.name, size: formatSize(model.size) })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                            {t('localModels.cancel')}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteModel(model.name)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {t('localModels.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DownloadProgress
        downloads={downloads}
        onCancel={cancelDownload}
        onDismiss={dismissDownload}
      />
    </div>
  );
};

export default LocalModelManager;