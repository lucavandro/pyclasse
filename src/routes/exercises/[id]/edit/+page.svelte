<script>
  import { page } from "$app/state";
  import ExerciseForm from "$lib/ExerciseForm.svelte";
</script>

<ExerciseForm id={page.params.id} />
