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
import { useDownloadStore } from '@/stores/downloadStore';
import { Trans } from 'react-i18next';
import LocalModelInfoDialog from '@/components/dialogs/LocalModelInfoDialog';

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
  const { startDownload } = useDownloadStore();

  const [localModels, setLocalModels] = useState<LocalModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pullModelName, setPullModelName] = useState('');
  const [infoModelName, setInfoModelName] = useState<string | null>(null);

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

    startDownload({ name: pullModelName, size: 0 });
    setPullModelName('');
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
            <div className="text-center text-white/70 py-8">{t('localModels.loading')}</div>
          ) : filteredModels.length === 0 ? (
            <div className="text-center text-white/70 py-8 space-y-2">
              <p>{searchQuery ? t('localModels.noModelsFound') : t('localModels.noLocalModels')}</p>
              {searchQuery ? (
                <p className="text-sm text-white/50">{t('localModels.adjustSearchCriteria')}</p>
              ) : (
                <p className="text-sm text-white/50">
                  <Trans
                    i18nKey="localModels.browseOnlineModels"
                    components={[
                      <Link to="/models" className={`text-sky-400 hover:underline`} />,
                    ]}
                  />
                </p>
              )}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={() => setInfoModelName(model.name)}
                    >
                      <Info className="w-4 h-4" />
                    </Button>

                    {/* Delete button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-400/70 hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
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
      <LocalModelInfoDialog
        modelName={infoModelName}
        open={!!infoModelName}
        onClose={() => setInfoModelName(null)}
      />
    </div>
  );
};

export default LocalModelManager;