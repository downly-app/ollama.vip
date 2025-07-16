import React from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
} from '@/components/ui/dialog';

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  imageUrl: string | null;
}

const ImagePreviewDialog = ({ isOpen, onOpenChange, imageUrl }: ImagePreviewDialogProps) => {
  if (!imageUrl) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className='max-w-4xl min-w-[400px] min-h-[300px] p-2 bg-black/50 border-gray-700 backdrop-blur-sm flex items-center justify-center'>
          <DialogTitle className='sr-only'>Image Preview</DialogTitle>
          <DialogDescription className='sr-only'>
            A larger view of the selected image.
          </DialogDescription>
          <img
            src={imageUrl}
            alt='Image preview'
            className='max-w-full max-h-[80vh] object-contain mx-auto rounded-lg'
          />
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default ImagePreviewDialog; 