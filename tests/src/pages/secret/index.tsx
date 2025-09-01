export default function SecretPage() {
  return (
    <div x-data="SecretPageData">
      <div class="text-3xl font-bold border-4 border-pink-500 bg-amber-200">My secret page</div>
      <button x-on:click="increaseCount" x-text="`count: ${count}`"></button>
    </div>
  )
}

<script />

export function SecretPageData() {
  return {
    count: 0,
    secretPageData: true,
    increaseCount() {
      this.count += 1;
    }
  }
}