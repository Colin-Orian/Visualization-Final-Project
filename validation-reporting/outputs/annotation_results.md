# Geographic NER annotation results

## Sample 1: predicted LOC/GPE mentions

- NER geographic precision: 85/100 = 85.00%
- NER false-positive proportion: 15/100 = 15.00%

## Sample 2: taxonomy-matched mentions

- Geographic-reference precision: 100/100 = 100.00%
- Canonical-region assignment accuracy among valid geographic mentions: 100/100 = 100.00%
- Correct canonical assignments: 100
- Incorrect canonical assignments: 0

## Scope

Recall is not estimated because undetected geographic references are not exhaustively annotated.

Annotation inputs:

- NER: `D:\Work\Coding\Visualization-Final-Project\validation-reporting\outputs\ner_validation_sample_100.csv`
- Canonical: `D:\Work\Coding\Visualization-Final-Project\validation-reporting\outputs\canonical_validation_sample_100.csv`
