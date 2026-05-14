using FluentValidation;
using TaskManager.Api.Domain.Enums;

namespace TaskManager.Api.Features.Tasks;

/// <summary>
/// Validates <see cref="CreateTaskRequest"/> before the create endpoint processes it.
/// </summary>
public class CreateTaskRequestValidator : AbstractValidator<CreateTaskRequest>
{
    /// <summary>Initialises validation rules for task creation.</summary>
    public CreateTaskRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Priority).IsInEnum();
    }
}

/// <summary>
/// Validates <see cref="UpdateTaskRequest"/> before the update endpoint processes it.
/// </summary>
public class UpdateTaskRequestValidator : AbstractValidator<UpdateTaskRequest>
{
    /// <summary>Initialises validation rules for task updates.</summary>
    public UpdateTaskRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Priority).IsInEnum();
        RuleFor(x => x.Status).IsInEnum();
    }
}
