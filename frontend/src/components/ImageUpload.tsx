import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'

interface ImageUploadProps {
  onImageUpload: (file: File) => void
  maxSize?: number // in MB
  acceptedTypes?: string[]
}

export default function ImageUpload({ 
  onImageUpload, 
  maxSize = 16, 
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] 
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors[0]?.code === 'file-too-large') {
        toast.error(`File too large. Maximum size is ${maxSize}MB`)
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        toast.error('Invalid file type. Please upload an image.')
      } else {
        toast.error('File upload failed. Please try again.')
      }
      return
    }

    // Handle accepted files
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)

      // Upload file
      setIsUploading(true)
      setTimeout(() => {
        onImageUpload(file)
        setIsUploading(false)
        toast.success('Image uploaded successfully!')
      }, 1000) // Simulate upload delay
    }
  }, [onImageUpload, maxSize])

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': acceptedTypes.map(type => type.replace('image/', '.'))
    },
    maxSize: maxSize * 1024 * 1024, // Convert MB to bytes
    multiple: false,
    noClick: preview !== null // Disable click when preview is shown
  })

  const clearPreview = () => {
    setPreview(null)
  }

  const handleCameraCapture = () => {
    // For mobile devices - open camera
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // Use back camera
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        onDrop([file], [])
      }
    }
    input.click()
  }

  if (preview) {
    return (
      <div className="relative">
        <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-48 object-cover"
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="loading-spinner w-8 h-8"></div>
            </div>
          )}
          <button
            onClick={clearPreview}
            className="absolute top-2 right-2 p-1.5 bg-gray-900/75 text-white rounded-full hover:bg-gray-900 transition-colors"
            disabled={isUploading}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
          {isUploading ? 'Processing image...' : 'Image ready for classification'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
          ${isDragActive 
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400 dark:hover:border-primary-500'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto">
            <ImageIcon className="h-8 w-8 text-gray-400 dark:text-gray-500" />
          </div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {isDragActive ? 'Drop your image here' : 'Upload an image'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag and drop an image, or click to browse
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Supports: JPEG, PNG, WebP, GIF (max {maxSize}MB)
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={open}
          className="flex-1 btn btn-outline"
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          Browse Files
        </button>
        
        <button
          onClick={handleCameraCapture}
          className="flex-1 btn btn-primary"
          disabled={isUploading}
        >
          <Camera className="h-4 w-4 mr-2" />
          Take Photo
        </button>
      </div>

      {/* Help Text */}
      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
        📱 On mobile: "Take Photo" opens your camera | 💻 On desktop: "Browse Files" to upload
      </div>
    </div>
  )
} 