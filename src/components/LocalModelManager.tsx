import {
  AlertCircle,
  Download,
  Filter,
  Grid,
  HardDrive,
  Info,
  List,
  Play,
  RefreshCw,
  Search,
  SortAsc,
  SortDesc,
  Trash2,
} from 'lucide-react';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trans } from 'react-i18next';
import { Link } from 'react-router-dom';

import LocalModelInfoDialog from '@/components/dialogs/LocalModelInfoDialog';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import CustomSelect from '@/components/ui/custom-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { ollamaApi } from '@/services/ollamaApi';
import { useDownloadStore } from '@/stores/downloadStore';

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
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'modified' | 'family'>('modified');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterFamily, setFilterFamily] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const fetchLocalModels = async () => {
    setIsLoading(true);
    try {
      const models = await ollamaApi.listModels();
      setLocalModels(models);
    } catch (error) {
      // Failed to fetch local models
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
      // Failed to delete model
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

  // Get unique families for filter dropdown
  const uniqueFamilies = useMemo(() => {
    const families = [...new Set(localModels.map(model => model.details.family))];
    return families.sort();
  }, [localModels]);

  // Enhanced filtering and sorting
  const filteredAndSortedModels = useMemo(() => {
    const filtered = localModels.filter(model => {
      const matchesSearch =
        model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.details.family.toLowerCase().includes(searchQuery.toLowerCase()) ||
        model.details.parameter_size.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFamily = filterFamily === 'all' || model.details.family === filterFamily;

      return matchesSearch && matchesFamily;
    });

    // Sort models
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'modified':
          comparison = new Date(a.modified_at).getTime() - new Date(b.modified_at).getTime();
          break;
        case 'family':
          comparison = a.details.family.localeCompare(b.details.family);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [localModels, searchQuery, filterFamily, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  useEffect(() => {
    fetchLocalModels();
  }, []);

  return (
    <div className='flex-1 flex flex-col h-full space-y-6'>
      {/* Header operation area */}
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between'>
          <div className='flex items-center gap-4'>
            <h2 className='text-2xl font-bold text-white'>{t('localModels.title')}</h2>
            <Badge variant='secondary' className='bg-white/20 text-white'>
              {t('localModels.modelsCount', { count: localModels.length })}
            </Badge>
            {filteredAndSortedModels.length !== localModels.length && (
              <Badge variant='outline' className='border-white/30 text-white/70'>
                {t('localModels.filteredCount', { count: filteredAndSortedModels.length })}
              </Badge>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Button
              onClick={fetchLocalModels}
              disabled={isLoading}
              size='sm'
              className={`bg-gradient-to-r ${currentTheme.colors.primary} text-white border-0 hover:opacity-90 disabled:opacity-50`}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </div>
        </div>

        {/* Enhanced filter and search bar */}
        <div className='flex flex-col sm:flex-row gap-3 items-start sm:items-center'>
          <div className='relative flex-1 min-w-0'>
            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4' />
            <Input
              type='text'
              placeholder={t('localModels.searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-white/40'
            />
          </div>

          <div className='flex items-center gap-2 flex-shrink-0'>
            {/* Family Filter */}
            <CustomSelect
              value={filterFamily}
              onValueChange={setFilterFamily}
              placeholder={t('localModels.family')}
              options={[
                { value: 'all', label: t('localModels.allFamilies') },
                ...uniqueFamilies.map(family => ({ value: family, label: family })),
              ]}
              className='w-36'
              size='sm'
              variant='outline'
            />

            {/* Sort Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  className='p-2 text-white/60 hover:text-white hover:bg-white/10 focus:bg-white/10 rounded-xl transition-all duration-200 focus:ring-1 focus:ring-white/40 focus:outline-none'
                >
                  {sortOrder === 'asc' ? (
                    <SortAsc className='w-4 h-4' />
                  ) : (
                    <SortDesc className='w-4 h-4' />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className='bg-white/10 backdrop-blur-xl border border-white/20 text-white shadow-2xl rounded-xl z-[9999] min-w-[140px]'
                sideOffset={4}
              >
                <DropdownMenuLabel className='text-white/70 text-xs px-3 py-2'>
                  Sort Options
                </DropdownMenuLabel>
                <DropdownMenuSeparator className='bg-white/20' />
                <DropdownMenuItem
                  onClick={() => handleSort('name')}
                  className='text-white hover:bg-white/20 focus:bg-white/20 focus:text-white cursor-pointer rounded-lg mx-1 my-0.5 px-3 py-2 text-sm data-[highlighted]:bg-white/20 data-[highlighted]:text-white'
                >
                  <div className='flex items-center justify-between w-full'>
                    <span>Name</span>
                    <div className='flex items-center gap-1'>
                      {sortBy === 'name' && (
                        <div className='w-2 h-2 rounded-full bg-blue-400 flex-shrink-0'></div>
                      )}
                      {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSort('size')}
                  className='text-white hover:bg-white/20 focus:bg-white/20 focus:text-white cursor-pointer rounded-lg mx-1 my-0.5 px-3 py-2 text-sm data-[highlighted]:bg-white/20 data-[highlighted]:text-white'
                >
                  <div className='flex items-center justify-between w-full'>
                    <span>Size</span>
                    <div className='flex items-center gap-1'>
                      {sortBy === 'size' && (
                        <div className='w-2 h-2 rounded-full bg-blue-400 flex-shrink-0'></div>
                      )}
                      {sortBy === 'size' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSort('modified')}
                  className='text-white hover:bg-white/20 focus:bg-white/20 focus:text-white cursor-pointer rounded-lg mx-1 my-0.5 px-3 py-2 text-sm data-[highlighted]:bg-white/20 data-[highlighted]:text-white'
                >
                  <div className='flex items-center justify-between w-full'>
                    <span>Installed</span>
                    <div className='flex items-center gap-1'>
                      {sortBy === 'modified' && (
                        <div className='w-2 h-2 rounded-full bg-blue-400 flex-shrink-0'></div>
                      )}
                      {sortBy === 'modified' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleSort('family')}
                  className='text-white hover:bg-white/20 focus:bg-white/20 focus:text-white cursor-pointer rounded-lg mx-1 my-0.5 px-3 py-2 text-sm data-[highlighted]:bg-white/20 data-[highlighted]:text-white'
                >
                  <div className='flex items-center justify-between w-full'>
                    <span>Family</span>
                    <div className='flex items-center gap-1'>
                      {sortBy === 'family' && (
                        <div className='w-2 h-2 rounded-full bg-blue-400 flex-shrink-0'></div>
                      )}
                      {sortBy === 'family' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View Mode Toggle */}
            <div className='flex items-center bg-white/10 rounded-md p-1'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                <Grid className='w-4 h-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
              >
                <List className='w-4 h-4' />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Download new model area */}
      <Card className='bg-white/10 backdrop-blur-sm border-white/20'>
        <CardHeader>
          <CardTitle className='text-white flex items-center gap-2'>
            <Download className='w-5 h-5' />
            {t('localModels.downloadNewModel')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col sm:flex-row gap-3'>
            <Input
              type='text'
              placeholder={t('localModels.modelNamePlaceholder')}
              value={pullModelName}
              onChange={e => setPullModelName(e.target.value)}
              className='flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50'
            />
            <Button
              onClick={handlePullModel}
              disabled={!pullModelName.trim()}
              className={`bg-gradient-to-r ${currentTheme.colors.primary} text-white`}
            >
              <Download className='w-4 h-4 mr-2' />
              {t('models.download')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Local models list */}
      <Card className='bg-white/10 backdrop-blur-sm border-white/20 flex-1'>
        <CardHeader>
          <CardTitle className='text-white flex items-center gap-2'>
            <HardDrive className='w-5 h-5' />
            {t('localModels.localModelsList')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='text-center text-white/70 py-12'>
              <RefreshCw className='w-8 h-8 animate-spin mx-auto mb-4 text-white/50' />
              <p>{t('localModels.loading')}</p>
            </div>
          ) : filteredAndSortedModels.length === 0 ? (
            <div className='text-center text-white/70 py-12 space-y-4'>
              <HardDrive className='w-16 h-16 mx-auto text-white/30' />
              <div className='space-y-2'>
                <p className='text-lg'>
                  {searchQuery || filterFamily !== 'all'
                    ? t('localModels.noModelsFound')
                    : t('localModels.noLocalModels')}
                </p>
                {searchQuery || filterFamily !== 'all' ? (
                  <div className='space-y-2'>
                    <p className='text-sm text-white/50'>{t('localModels.adjustSearchCriteria')}</p>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setSearchQuery('');
                        setFilterFamily('all');
                      }}
                      className='bg-white/10 border-white/20 text-white hover:bg-white/20'
                    >
                      Clear Filters
                    </Button>
                  </div>
                ) : (
                  <p className='text-sm text-white/50'>
                    <Trans
                      i18nKey='localModels.browseOnlineModels'
                      components={[
                        <Link to='/models' className={`text-sky-400 hover:underline`} />,
                      ]}
                    />
                  </p>
                )}
              </div>
            </div>
          ) : (
            <ScrollArea className='h-full'>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4'
                    : 'space-y-3 pb-4'
                }
              >
                {filteredAndSortedModels.map(model =>
                  viewMode === 'grid' ? (
                    // Grid View Card
                    <div
                      key={model.name}
                      className='group p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200'
                    >
                      <div className='flex items-start justify-between mb-3'>
                        <div className='flex-1 min-w-0'>
                          <Link
                            to={`/model/${model.name.split(':')[0]}`}
                            className='text-white font-medium hover:text-sky-400 transition-colors block truncate text-sm'
                          >
                            {model.name}
                          </Link>
                          <div className='flex items-center gap-2 mt-1'>
                            <Badge
                              variant='outline'
                              className='border-white/30 text-white/70 text-xs px-2 py-0'
                            >
                              {model.details.family}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className='space-y-2 text-xs text-white/60 mb-4'>
                        <div className='flex justify-between'>
                          <span>{t('localModels.size')}:</span>
                          <span className='font-mono'>{formatSize(model.size)}</span>
                        </div>
                        <div className='flex justify-between'>
                          <span>{t('localModels.parameters')}:</span>
                          <span className='font-mono'>{model.details.parameter_size}</span>
                        </div>
                        <div className='flex justify-between'>
                          <span>{t('localModels.installedTime')}:</span>
                          <span className='font-mono text-xs'>{formatDate(model.modified_at)}</span>
                        </div>
                      </div>

                      <div className='flex gap-2'>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='flex-1 text-white/70 hover:bg-white/10 hover:text-white text-xs'
                          onClick={() => setInfoModelName(model.name)}
                        >
                          <Info className='w-3 h-3 mr-1' />
                          Details
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant='ghost'
                              size='sm'
                              className='text-red-400/70 hover:bg-red-500/10 hover:text-red-400 px-2'
                            >
                              <Trash2 className='w-3 h-3' />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className='bg-black/20 backdrop-blur-xl border-white/20 text-white shadow-2xl'>
                            <AlertDialogHeader>
                              <AlertDialogTitle className='flex items-center gap-2'>
                                <AlertCircle className='w-5 h-5 text-red-400' />
                                {t('localModels.confirmDeleteModel')}
                              </AlertDialogTitle>
                              <AlertDialogDescription className='text-white/70'>
                                {t('localModels.deleteConfirmation', {
                                  modelName: model.name,
                                  size: formatSize(model.size),
                                })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className='bg-white/10 border-white/20 text-white hover:bg-white/20'>
                                {t('localModels.cancel')}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteModel(model.name)}
                                className='bg-red-600 hover:bg-red-700 text-white'
                              >
                                {t('localModels.delete')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ) : (
                    // List View Row
                    <div
                      key={model.name}
                      className='group p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-4 flex-1 min-w-0'>
                          <div className='flex-1 min-w-0'>
                            <Link
                              to={`/model/${model.name.split(':')[0]}`}
                              className='text-white font-medium hover:text-sky-400 transition-colors block truncate'
                            >
                              {model.name}
                            </Link>
                            <div className='flex items-center gap-2 mt-1'>
                              <Badge
                                variant='outline'
                                className='border-white/30 text-white/70 text-xs px-2 py-0'
                              >
                                {model.details.family}
                              </Badge>
                              <span className='text-white/50 text-xs'>
                                {model.details.parameter_size}
                              </span>
                            </div>
                          </div>

                          <div className='hidden sm:flex items-center gap-6 text-sm text-white/60'>
                            <div className='text-center'>
                              <div className='font-mono'>{formatSize(model.size)}</div>
                              <div className='text-xs text-white/40'>Size</div>
                            </div>
                            <div className='text-center'>
                              <div className='font-mono text-xs'>
                                {formatDate(model.modified_at)}
                              </div>
                              <div className='text-xs text-white/40'>Installed</div>
                            </div>
                          </div>
                        </div>

                        <div className='flex items-center gap-2 flex-shrink-0'>
                          <Button
                            variant='ghost'
                            size='sm'
                            className='text-white/70 hover:bg-white/10 hover:text-white'
                            onClick={() => setInfoModelName(model.name)}
                          >
                            <Info className='w-4 h-4' />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant='ghost'
                                size='sm'
                                className='text-red-400/70 hover:bg-red-500/10 hover:text-red-400'
                              >
                                <Trash2 className='w-4 h-4' />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className='bg-black/20 backdrop-blur-xl border-white/20 text-white shadow-2xl'>
                              <AlertDialogHeader>
                                <AlertDialogTitle className='flex items-center gap-2'>
                                  <AlertCircle className='w-5 h-5 text-red-400' />
                                  {t('localModels.confirmDeleteModel')}
                                </AlertDialogTitle>
                                <AlertDialogDescription className='text-white/70'>
                                  {t('localModels.deleteConfirmation', {
                                    modelName: model.name,
                                    size: formatSize(model.size),
                                  })}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className='bg-white/10 border-white/20 text-white hover:bg-white/20'>
                                  {t('localModels.cancel')}
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteModel(model.name)}
                                  className='bg-red-600 hover:bg-red-700 text-white'
                                >
                                  {t('localModels.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </ScrollArea>
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
