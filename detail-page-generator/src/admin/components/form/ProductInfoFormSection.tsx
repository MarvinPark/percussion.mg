import type { Product } from '../../../types/product'
import { createId } from '../../../lib/id'
import { FormSection } from './FormSection'
import { FieldLabel } from './FieldLabel'
import { TextArea } from './TextArea'
import { TextInput } from './TextInput'
import { ImageUrlField } from './ImageUrlField'

type ProductInfoFormSectionProps = {
  product: Product
  onProductChange: (patch: Partial<Product>) => void
}

export function ProductInfoFormSection({ product, onProductChange }: ProductInfoFormSectionProps) {
  const mainImage = product.images.find((i) => i.isMain) ?? product.images[0]

  const setMainImageUrl = (url: string) => {
    if (!url) return
    if (mainImage) {
      onProductChange({
        images: product.images.map((img) =>
          img.id === mainImage.id ? { ...img, imageUrl: url } : img,
        ),
      })
    } else {
      onProductChange({
        images: [
          {
            id: createId('img'),
            productId: product.id,
            imageUrl: url,
            sortOrder: 0,
            isMain: true,
          },
        ],
      })
    }
  }

  return (
    <FormSection title="제품 소개">
      <div>
        <FieldLabel htmlFor="product-name">제품명</FieldLabel>
        <TextInput
          id="product-name"
          value={product.productName}
          onChange={(e) => onProductChange({ productName: e.target.value })}
        />
      </div>
      <div>
        <FieldLabel htmlFor="model-name">모델명</FieldLabel>
        <TextInput
          id="model-name"
          value={product.modelName}
          onChange={(e) => onProductChange({ modelName: e.target.value })}
        />
      </div>
      <ImageUrlField
        id="main-image"
        label="메인 이미지"
        hint="STEP 6에서 다중 업로드·순서 변경·대표 지정 UI가 추가됩니다."
        value={mainImage?.imageUrl ?? ''}
        onChange={setMainImageUrl}
      />
      <div>
        <FieldLabel htmlFor="short-desc">짧은 제품 소개</FieldLabel>
        <TextInput
          id="short-desc"
          value={product.shortDescription}
          onChange={(e) => onProductChange({ shortDescription: e.target.value })}
        />
      </div>
      <div>
        <FieldLabel htmlFor="long-desc">긴 제품 설명</FieldLabel>
        <TextArea
          id="long-desc"
          rows={6}
          value={product.longDescription}
          onChange={(e) => onProductChange({ longDescription: e.target.value })}
        />
      </div>
    </FormSection>
  )
}
